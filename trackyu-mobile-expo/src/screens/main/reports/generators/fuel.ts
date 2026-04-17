/**
 * TrackYu Mobile — Module 3 : Carburant
 * synthese · levels · critical · refills · drops · consumption · vs_theo · anomalies
 */
import vehiclesApi, { type Vehicle, type FuelEvent } from '../../../../api/vehicles';
import alertsApi from '../../../../api/alerts';
import { runWithConcurrency } from '../../../../utils/pLimit';
import { ReportFilters, ReportResult, getPeriodRange, fmtDate, fmtTime, fmtNum, matchText } from '../types';

function filterVeh(vehicles: Vehicle[], f: ReportFilters) {
  return vehicles.filter((v) => {
    if (f.vehicleIds.length && !f.vehicleIds.includes(v.id)) return false;
    if (!matchText(v.clientName, f.client)) return false;
    if (!matchText(v.groupName ?? undefined, f.branche)) return false;
    return true;
  });
}

function fuelLevel(v: Vehicle): number | null {
  return v.fuel ?? v.fuelLevel ?? null;
}

// ── Synthèse ──────────────────────────────────────────────────────────────────

async function genFuelSynthese(vehicles: Vehicle[], f: ReportFilters): Promise<ReportResult> {
  const { start, end } = getPeriodRange(f);
  const allFiltered = filterVeh(vehicles, f);
  const withFuel = allFiltered.filter((v) => fuelLevel(v) != null);
  const noFuel = allFiltered.filter((v) => fuelLevel(v) == null).length;
  const offline = allFiltered.filter((v) => v.status === 'offline').length;

  const critical = withFuel.filter((v) => (fuelLevel(v) ?? 100) < 20).length;
  const low = withFuel.filter((v) => {
    const l = fuelLevel(v) ?? 100;
    return l >= 20 && l < 40;
  }).length;
  const ok = withFuel.filter((v) => (fuelLevel(v) ?? 0) >= 40).length;
  const avg = withFuel.length ? withFuel.reduce((s, v) => s + (fuelLevel(v) ?? 0), 0) / withFuel.length : 0;

  // Recharges + baisses sur la période (limité à 20 engins)
  const selected = allFiltered.slice(0, 20);
  let nbRefills = 0,
    volRefills = 0,
    nbDrops = 0,
    volDrops = 0;
  await runWithConcurrency(
    selected.map((v) => async () => {
      const events = await vehiclesApi
        .getFuelHistory(v.id, start.toISOString().split('T')[0], end.toISOString().split('T')[0])
        .catch(() => [] as FuelEvent[]);
      for (const e of events) {
        if (e.type === 'refill') {
          nbRefills++;
          volRefills += e.volume ?? 0;
        }
        if (e.type === 'theft') {
          nbDrops++;
          volDrops += e.volume ?? 0;
        }
      }
    })
  );

  const fuelAlerts = await alertsApi
    .getAll()
    .then((all) => {
      const fuelTypes = ['fuel', 'FUEL_LEVEL', 'FUEL_THEFT'];
      return all.filter(
        (a) => fuelTypes.includes(a.type) && new Date(a.createdAt) >= start && new Date(a.createdAt) <= end
      );
    })
    .catch(() => []);

  return {
    title: 'Synthèse Carburant',
    kpis: [
      { label: 'Avec données', value: String(withFuel.length), color: '#F59E0B' },
      { label: 'Critique (<20%)', value: String(critical), color: '#EF4444' },
      { label: 'GPS hors ligne', value: String(offline), color: '#6B7280' },
      { label: 'Niveau moyen', value: withFuel.length ? `${Math.round(avg)}%` : '—', color: '#22C55E' },
    ],
    columns: ['Indicateur', 'Valeur'],
    rows: [
      ['Engins avec données carburant', String(withFuel.length)],
      ['Sans données carburant', String(noFuel)],
      ['GPS hors ligne', String(offline)],
      ['Niveau critique (<20%)', String(critical)],
      ['Niveau bas (20-40%)', String(low)],
      ['Niveau normal (≥40%)', String(ok)],
      ['Niveau moyen', withFuel.length ? `${Math.round(avg)}%` : '—'],
      ['Recharges sur la période', `${nbRefills}  (${Math.round(volRefills)} L)`],
      ['Baisses suspectes', `${nbDrops}  (${Math.round(volDrops)} L)`],
      ['Alertes carburant (période)', String(fuelAlerts.length)],
    ],
    chart: {
      type: 'bar',
      title: 'Répartition des niveaux',
      items: [
        { label: 'Critique', value: critical, color: '#EF4444' },
        { label: 'Bas', value: low, color: '#F97316' },
        { label: 'Normal', value: ok, color: '#22C55E' },
        { label: 'Sans données', value: noFuel, color: '#9CA3AF' },
        { label: 'Hors ligne', value: offline, color: '#6B7280' },
      ].filter((i) => i.value > 0),
    },
    note:
      selected.length >= 20
        ? 'Recharges et baisses limitées aux 20 premiers engins. Affinez la sélection pour voir plus.'
        : undefined,
  };
}

// ── Helpers chart temporel ────────────────────────────────────────────────────

/**
 * Agrège des valeurs (level%) par jour/semaine/mois selon l'amplitude de la période.
 * Retourne un tableau trié de { key (YYYY-MM-DD / YYYY-Www / YYYY-MM), values[] }.
 */
function periodGranularity(start: Date, end: Date): 'day' | 'week' | 'month' {
  const days = (end.getTime() - start.getTime()) / 86_400_000;
  if (days <= 14) return 'day';
  if (days <= 60) return 'week';
  return 'month';
}

function bucketKey(ts: string, gran: 'day' | 'week' | 'month'): string {
  const d = new Date(ts);
  if (gran === 'day') return d.toISOString().slice(0, 10);
  if (gran === 'month') return d.toISOString().slice(0, 7);
  // ISO week: YYYY-Www
  const thu = new Date(d);
  thu.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 3);
  const yr = thu.getFullYear();
  const jan4 = new Date(yr, 0, 4);
  const wk = Math.ceil(((thu.getTime() - jan4.getTime()) / 86_400_000 + jan4.getDay() + 1) / 7);
  return `${yr}-W${String(wk).padStart(2, '0')}`;
}

function bucketLabel(key: string, gran: 'day' | 'week' | 'month'): string {
  if (gran === 'day') return key.slice(5); // MM-DD
  if (gran === 'month') return key.slice(0, 7); // YYYY-MM
  return key; // YYYY-Www
}

// ── Niveaux actuels ───────────────────────────────────────────────────────────

async function genFuelLevels(vehicles: Vehicle[], f: ReportFilters): Promise<ReportResult> {
  const { start, end } = getPeriodRange(f);
  const list = filterVeh(vehicles, f)
    .filter((v) => fuelLevel(v) != null)
    .sort((a, b) => (fuelLevel(a) ?? 0) - (fuelLevel(b) ?? 0));

  const avg = list.length ? list.reduce((s, v) => s + (fuelLevel(v) ?? 0), 0) / list.length : 0;

  // Chart : niveaux moyens quotidiens/hebdo/mensuels sur la période
  const gran = periodGranularity(start, end);
  const selected = list.slice(0, 20);
  const buckets: Record<string, number[]> = {};

  await runWithConcurrency(
    selected.map((v) => async () => {
      const events = await vehiclesApi
        .getFuelHistory(v.id, start.toISOString().split('T')[0], end.toISOString().split('T')[0])
        .catch(() => [] as FuelEvent[]);
      for (const e of events) {
        const k = bucketKey(e.timestamp, gran);
        if (!buckets[k]) buckets[k] = [];
        buckets[k].push(e.level);
      }
    })
  );

  const chartItems = Object.keys(buckets)
    .sort()
    .map((k) => {
      const vals = buckets[k];
      const mean = Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
      return {
        label: bucketLabel(k, gran),
        value: mean,
        color: mean < 20 ? '#EF4444' : mean < 40 ? '#F97316' : '#22C55E',
      };
    });

  const granLabel = gran === 'day' ? 'quotidien' : gran === 'week' ? 'hebdomadaire' : 'mensuel';

  return {
    title: 'Niveaux de carburant actuels',
    kpis: [
      { label: 'Engins', value: String(list.length), color: '#F59E0B' },
      {
        label: 'Critique (<20%)',
        value: String(list.filter((v) => (fuelLevel(v) ?? 100) < 20).length),
        color: '#EF4444',
      },
      {
        label: 'Bas (20-40%)',
        value: String(
          list.filter((v) => {
            const l = fuelLevel(v) ?? 100;
            return l >= 20 && l < 40;
          }).length
        ),
        color: '#F97316',
      },
      { label: 'Niveau moyen', value: `${Math.round(avg)}%`, color: '#22C55E' },
    ],
    columns: ['Engin', 'Plaque', 'Niveau', 'Statut', 'Capacité (L)', 'Volume estimé (L)', 'Client', 'Conducteur'],
    rows: list.map((v) => {
      const lvl = fuelLevel(v) ?? 0;
      const cap = v.tankCapacity ?? null;
      const vol = cap ? Math.round((cap * lvl) / 100) : null;
      return [
        v.name,
        v.plate,
        `${lvl}%`,
        lvl < 20 ? 'CRITIQUE' : lvl < 40 ? 'BAS' : 'OK',
        cap ? `${cap} L` : '—',
        vol != null ? `${vol} L` : '—',
        v.clientName ?? '—',
        v.driver?.name ?? v.driverName ?? '—',
      ];
    }),
    chart: chartItems.length
      ? {
          type: 'bar',
          title: `Niveau moyen flotte — suivi ${granLabel} (%)`,
          items: chartItems,
        }
      : {
          type: 'bar',
          title: 'Niveaux actuels — top 10 plus bas (%)',
          items: list.slice(0, 10).map((v) => ({
            label: v.name.length <= 10 ? v.name : v.plate,
            value: fuelLevel(v) ?? 0,
            color: (fuelLevel(v) ?? 100) < 20 ? '#EF4444' : (fuelLevel(v) ?? 100) < 40 ? '#F97316' : '#22C55E',
          })),
        },
  };
}

// ── Critique & Bas ────────────────────────────────────────────────────────────

function genFuelCritical(vehicles: Vehicle[], f: ReportFilters): ReportResult {
  const list = filterVeh(vehicles, f)
    .filter((v) => (fuelLevel(v) ?? 100) < 40)
    .sort((a, b) => (fuelLevel(a) ?? 0) - (fuelLevel(b) ?? 0));

  return {
    title: 'Engins à ravitailler (< 40%)',
    kpis: [
      { label: 'À ravitailler', value: String(list.length), color: '#F97316' },
      {
        label: 'Critique (<20%)',
        value: String(list.filter((v) => (fuelLevel(v) ?? 0) < 20).length),
        color: '#EF4444',
      },
      {
        label: 'Bas (20-40%)',
        value: String(
          list.filter((v) => {
            const l = fuelLevel(v) ?? 0;
            return l >= 20 && l < 40;
          }).length
        ),
        color: '#F59E0B',
      },
      {
        label: 'Clients impactés',
        value: String(new Set(list.map((v) => v.clientName).filter(Boolean)).size),
        color: '#3B82F6',
      },
    ],
    columns: ['Engin', 'Plaque', 'Niveau', 'Statut', 'Volume restant (L)', 'Client', 'Conducteur', 'Dernière MAJ'],
    rows: list.map((v) => {
      const lvl = fuelLevel(v) ?? 0;
      const cap = v.tankCapacity ?? null;
      return [
        v.name,
        v.plate,
        `${lvl}%`,
        lvl < 20 ? 'CRITIQUE' : 'BAS',
        cap ? `${Math.round((cap * lvl) / 100)} L` : '—',
        v.clientName ?? '—',
        v.driver?.name ?? v.driverName ?? '—',
        fmtDate(v.lastUpdate),
      ];
    }),
    chart: list.length
      ? {
          type: 'bar',
          title: 'Niveaux des engins à ravitailler (%) — plus critiques en premier',
          items: list.slice(0, 12).map((v) => {
            const lvl = fuelLevel(v) ?? 0;
            return {
              label: v.name.length <= 10 ? v.name : v.plate,
              value: lvl,
              color: lvl < 20 ? '#EF4444' : '#F97316',
            };
          }),
        }
      : undefined,
  };
}

// ── Recharges ────────────────────────────────────────────────────────────────

async function genFuelRefills(vehicles: Vehicle[], f: ReportFilters): Promise<ReportResult> {
  const { start, end } = getPeriodRange(f);
  const selected = filterVeh(vehicles, f).slice(0, 20);

  const allRefills: { vehicle: Vehicle; event: FuelEvent }[] = [];
  await runWithConcurrency(
    selected.map((v) => async () => {
      const events = await vehiclesApi
        .getFuelHistory(v.id, start.toISOString().split('T')[0], end.toISOString().split('T')[0])
        .catch(() => [] as FuelEvent[]);
      events.filter((e) => e.type === 'refill').forEach((e) => allRefills.push({ vehicle: v, event: e }));
    })
  );
  allRefills.sort((a, b) => new Date(b.event.timestamp).getTime() - new Date(a.event.timestamp).getTime());

  const totalVol = allRefills.reduce((s, r) => s + (r.event.volume ?? 0), 0);

  // Chart : volume rechargé par période
  const gran = periodGranularity(start, end);
  const volBuckets: Record<string, number> = {};
  for (const r of allRefills) {
    const k = bucketKey(r.event.timestamp, gran);
    volBuckets[k] = (volBuckets[k] ?? 0) + (r.event.volume ?? 0);
  }
  const chartItems = Object.keys(volBuckets)
    .sort()
    .map((k) => ({
      label: bucketLabel(k, gran),
      value: Math.round(volBuckets[k]),
      color: '#22C55E',
    }));

  const granLabel = gran === 'day' ? 'quotidien' : gran === 'week' ? 'hebdomadaire' : 'mensuel';

  return {
    title: 'Recharges de carburant',
    kpis: [
      { label: 'Recharges', value: String(allRefills.length), color: '#22C55E' },
      { label: 'Volume total', value: `${Math.round(totalVol)} L`, color: '#3B82F6' },
      {
        label: 'Vol. moyen',
        value: allRefills.length ? `${Math.round(totalVol / allRefills.length)} L` : '—',
        color: '#F59E0B',
      },
      { label: 'Engins', value: String(new Set(allRefills.map((r) => r.vehicle.id)).size), color: '#8B5CF6' },
    ],
    columns: ['Engin', 'Plaque', 'Date', 'Heure', 'Niveau après', 'Volume rechargé (L)', 'Client', 'Conducteur'],
    rows: allRefills.map((r) => [
      r.vehicle.name,
      r.vehicle.plate,
      fmtDate(r.event.timestamp),
      fmtTime(r.event.timestamp),
      `${r.event.level}%`,
      r.event.volume != null ? `${r.event.volume.toFixed(1)} L` : '—',
      r.vehicle.clientName ?? '—',
      r.vehicle.driver?.name ?? r.vehicle.driverName ?? '—',
    ]),
    chart: chartItems.length
      ? {
          type: 'bar',
          title: `Volume rechargé — suivi ${granLabel} (L)`,
          items: chartItems,
        }
      : undefined,
    note: selected.length >= 20 ? 'Limité aux 20 premiers engins. Affinez la sélection pour voir plus.' : undefined,
  };
}

// ── Baisses ───────────────────────────────────────────────────────────────────

async function genFuelDrops(vehicles: Vehicle[], f: ReportFilters): Promise<ReportResult> {
  const { start, end } = getPeriodRange(f);
  const selected = filterVeh(vehicles, f).slice(0, 20);

  const allDrops: { vehicle: Vehicle; event: FuelEvent }[] = [];
  await runWithConcurrency(
    selected.map((v) => async () => {
      const events = await vehiclesApi
        .getFuelHistory(v.id, start.toISOString().split('T')[0], end.toISOString().split('T')[0])
        .catch(() => [] as FuelEvent[]);
      events.filter((e) => e.type === 'theft').forEach((e) => allDrops.push({ vehicle: v, event: e }));
    })
  );
  allDrops.sort((a, b) => new Date(b.event.timestamp).getTime() - new Date(a.event.timestamp).getTime());

  const totalVol = allDrops.reduce((s, r) => s + (r.event.volume ?? 0), 0);

  // Chart : volume perdu par période
  const gran = periodGranularity(start, end);
  const volBuckets: Record<string, number> = {};
  for (const r of allDrops) {
    const k = bucketKey(r.event.timestamp, gran);
    volBuckets[k] = (volBuckets[k] ?? 0) + (r.event.volume ?? 0);
  }
  const chartItems = Object.keys(volBuckets)
    .sort()
    .map((k) => ({
      label: bucketLabel(k, gran),
      value: Math.round(volBuckets[k]),
      color: '#EF4444',
    }));

  const granLabel = gran === 'day' ? 'quotidien' : gran === 'week' ? 'hebdomadaire' : 'mensuel';

  return {
    title: 'Baisses de carburant',
    kpis: [
      { label: 'Baisses détectées', value: String(allDrops.length), color: '#EF4444' },
      { label: 'Volume total', value: `${Math.round(totalVol)} L`, color: '#DC2626' },
      {
        label: 'Vol. moyen',
        value: allDrops.length ? `${Math.round(totalVol / allDrops.length)} L` : '—',
        color: '#F59E0B',
      },
      { label: 'Engins', value: String(new Set(allDrops.map((r) => r.vehicle.id)).size), color: '#3B82F6' },
    ],
    columns: ['Engin', 'Plaque', 'Date', 'Heure', 'Niveau constaté', 'Volume estimé (L)', 'Client', 'Conducteur'],
    rows: allDrops.map((r) => [
      r.vehicle.name,
      r.vehicle.plate,
      fmtDate(r.event.timestamp),
      fmtTime(r.event.timestamp),
      `${r.event.level}%`,
      r.event.volume != null ? `${r.event.volume.toFixed(1)} L` : '—',
      r.vehicle.clientName ?? '—',
      r.vehicle.driver?.name ?? r.vehicle.driverName ?? '—',
    ]),
    chart: chartItems.length
      ? {
          type: 'bar',
          title: `Volume perdu (baisses suspectes) — suivi ${granLabel} (L)`,
          items: chartItems,
        }
      : undefined,
    note: selected.length >= 20 ? 'Limité aux 20 premiers engins. Affinez la sélection pour voir plus.' : undefined,
  };
}

// ── Consommation capteurs ─────────────────────────────────────────────────────

async function genFuelConsumption(vehicles: Vehicle[], f: ReportFilters): Promise<ReportResult> {
  const selected = filterVeh(vehicles, f).slice(0, 20);

  const results: { vehicle: Vehicle; avg: number; total: number; refills: number; tankCap: number | null }[] = [];
  await runWithConcurrency(
    selected.map((v) => async () => {
      const stats = await vehiclesApi.getFuelStats(v.id).catch(() => null);
      results.push({
        vehicle: v,
        avg: stats?.avgConsumption ?? 0,
        total: stats?.totalConsumption ?? 0,
        refills: stats?.refillCount ?? 0,
        tankCap: stats?.tankCapacity ?? v.tankCapacity ?? null,
      });
    })
  );

  // Tri déterministe : plus consommateurs en premier
  results.sort((a, b) => b.total - a.total);

  const totalCons = results.reduce((s, r) => s + r.total, 0);
  const withAvg = results.filter((r) => r.avg > 0);
  const avgCons = withAvg.length ? withAvg.reduce((s, r) => s + r.avg, 0) / withAvg.length : 0;
  const maxTotal = results[0]?.total ?? 1;

  return {
    title: 'Consommation carburant (capteurs)',
    kpis: [
      { label: 'Conso. totale', value: `${Math.round(totalCons)} L`, color: '#F59E0B' },
      { label: 'Conso. moy./100km', value: avgCons > 0 ? `${avgCons.toFixed(1)} L` : '—', color: '#3B82F6' },
      { label: 'Engins', value: String(selected.length), color: '#8B5CF6' },
      { label: 'Avec données', value: String(results.filter((r) => r.total > 0).length), color: '#22C55E' },
    ],
    columns: [
      'Engin',
      'Plaque',
      'Conso. totale (L)',
      'Conso. moy. (L/100km)',
      'Nb recharges',
      'Capacité réservoir',
      'Client',
      'Conducteur',
    ],
    rows: results.map((r) => [
      r.vehicle.name,
      r.vehicle.plate,
      r.total > 0 ? `${r.total.toFixed(1)} L` : '—',
      r.avg > 0 ? `${r.avg.toFixed(1)}` : '—',
      String(r.refills),
      r.tankCap ? `${r.tankCap} L` : '—',
      r.vehicle.clientName ?? '—',
      r.vehicle.driver?.name ?? r.vehicle.driverName ?? '—',
    ]),
    chart: results.some((r) => r.total > 0)
      ? {
          type: 'bar',
          title: 'Consommation totale par engin (L) — top 10',
          items: results
            .filter((r) => r.total > 0)
            .slice(0, 10)
            .map((r) => ({
              label: r.vehicle.name.length <= 10 ? r.vehicle.name : r.vehicle.plate,
              value: Math.round(r.total),
              // rouge si > 80% du max, orange si > 50%, vert sinon
              color: r.total > maxTotal * 0.8 ? '#EF4444' : r.total > maxTotal * 0.5 ? '#F97316' : '#22C55E',
            })),
        }
      : undefined,
    note: 'Données globales tous temps (non filtrées par période). Limité aux 20 premiers engins.',
  };
}

// ── Réelle vs Théorique ───────────────────────────────────────────────────────

async function genFuelVsTheo(vehicles: Vehicle[], f: ReportFilters): Promise<ReportResult> {
  const { start, end } = getPeriodRange(f);
  const startStr = start.toISOString().split('T')[0];
  const endStr = end.toISOString().split('T')[0];
  const selected = filterVeh(vehicles, f)
    .filter((v) => v.theoreticalConsumption != null)
    .slice(0, 20);

  type Row = {
    vehicle: Vehicle;
    dist: number;
    realConsL: number | null;
    theoCons: number;
    diff: number | null;
    diffPct: number | null;
  };
  const results: Row[] = [];

  await runWithConcurrency(
    selected.map((v) => async () => {
      const [trips, fuelEvents] = await Promise.all([
        vehiclesApi.getTrips(v.id, start.toISOString(), end.toISOString()).catch(() => []),
        vehiclesApi.getFuelHistory(v.id, startStr, endStr).catch(() => [] as FuelEvent[]),
      ]);

      // Distance parcourue sur la période
      const dist = trips.reduce((s, t) => s + (t.distance_km ?? 0), 0);

      // Conso réelle sur la période : somme des baisses entre relevés normaux consécutifs
      const normals = fuelEvents
        .filter((e) => e.type === 'normal')
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      let droppedPct = 0;
      for (let i = 1; i < normals.length; i++) {
        const delta = normals[i - 1].level - normals[i].level;
        if (delta > 0) droppedPct += delta;
      }
      const cap = v.tankCapacity ?? null;
      const realConsL = cap != null ? (droppedPct / 100) * cap : null;

      // Conso théorique sur la période
      const theoCons = (dist * (v.theoreticalConsumption ?? 0)) / 100;

      // Écart (uniquement si conso réelle en litres disponible)
      const diff = realConsL != null ? realConsL - theoCons : null;
      const diffPct = diff != null && theoCons > 0 ? (diff / theoCons) * 100 : null;

      results.push({ vehicle: v, dist, realConsL, theoCons, diff, diffPct });
    })
  );

  // Tri : surconsommateurs en premier (diff % desc), puis pas de données en bas
  results.sort((a, b) => {
    if (a.diffPct == null && b.diffPct == null) return 0;
    if (a.diffPct == null) return 1;
    if (b.diffPct == null) return -1;
    return b.diffPct - a.diffPct;
  });

  const overCount = results.filter((r) => (r.diff ?? 0) > 0).length;
  const totalDist = results.reduce((s, r) => s + r.dist, 0);

  return {
    title: 'Consommation réelle vs théorique',
    kpis: [
      { label: 'Engins comparés', value: String(results.length), color: '#F59E0B' },
      { label: 'Surconsommation', value: String(overCount), color: '#EF4444' },
      {
        label: 'Dans la norme',
        value: String(results.filter((r) => r.diff != null && r.diff <= 0).length),
        color: '#22C55E',
      },
      { label: 'Distance totale', value: `${fmtNum(totalDist)} km`, color: '#3B82F6' },
    ],
    columns: [
      'Engin',
      'Plaque',
      'Distance (km)',
      'Conso. réelle (L)',
      'Conso. théo. (L)',
      'Écart (L)',
      'Écart (%)',
      'Client',
      'Conducteur',
    ],
    rows: results.map((r) => [
      r.vehicle.name,
      r.vehicle.plate,
      fmtNum(r.dist),
      r.realConsL != null ? `${r.realConsL.toFixed(1)} L` : '— (cap. inconnue)',
      `${r.theoCons.toFixed(1)} L`,
      r.diff != null ? (r.diff >= 0 ? `+${r.diff.toFixed(1)} L` : `${r.diff.toFixed(1)} L`) : '—',
      r.diffPct != null ? (r.diffPct >= 0 ? `+${r.diffPct.toFixed(1)}%` : `${r.diffPct.toFixed(1)}%`) : '—',
      r.vehicle.clientName ?? '—',
      r.vehicle.driver?.name ?? r.vehicle.driverName ?? '—',
    ]),
    chart: results.some((r) => r.diff != null)
      ? {
          type: 'bar',
          title: 'Écart conso réelle vs théorique (%) — rouge = surconsommation',
          items: results
            .filter((r) => r.diffPct != null)
            .slice(0, 12)
            .map((r) => ({
              label: r.vehicle.name.length <= 10 ? r.vehicle.name : r.vehicle.plate,
              value: Math.abs(Math.round(r.diffPct!)),
              color: (r.diffPct ?? 0) > 20 ? '#EF4444' : (r.diffPct ?? 0) > 0 ? '#F97316' : '#22C55E',
            })),
        }
      : undefined,
    note:
      results.length === 0
        ? 'Aucun engin avec consommation théorique configurée.'
        : selected.length >= 20
          ? 'Limité aux 20 premiers engins. La conso. réelle est calculée sur la période sélectionnée.'
          : 'La conso. réelle est calculée depuis les relevés capteur sur la période sélectionnée.',
  };
}

// ── Anomalies ─────────────────────────────────────────────────────────────────

type AnomalySev = 'CRITIQUE' | 'SUSPECT' | 'INFO';
interface AnomalyRow {
  vehicle: Vehicle;
  type: string;
  sev: AnomalySev;
  detail: string;
  date: string;
}

const SEV_ICON: Record<AnomalySev, string> = { CRITIQUE: '🔴', SUSPECT: '🟡', INFO: '⚪' };
const SEV_ORDER: Record<AnomalySev, number> = { CRITIQUE: 0, SUSPECT: 1, INFO: 2 };
const TYPE_COLOR: Record<string, string> = {
  'Niveau invalide': '#EF4444',
  'Spike capteur': '#EF4444',
  'Slow drain': '#EF4444',
  'Recharge fantôme': '#EF4444',
  'Variation instable': '#F97316',
  'Capteur gelé': '#F97316',
  'Interruption données fuel': '#F97316',
  'Sur-consommation': '#F97316',
  'Consommation nocturne': '#F97316',
  'Double recharge': '#F97316',
  'GPS inactif (perte fuel)': '#6B7280',
};

async function genFuelAnomalies(vehicles: Vehicle[], f: ReportFilters): Promise<ReportResult> {
  const { start, end } = getPeriodRange(f);
  const startStr = start.toISOString().split('T')[0];
  const endStr = end.toISOString().split('T')[0];
  const selected = filterVeh(vehicles, f).slice(0, 20);
  const anomalies: AnomalyRow[] = [];

  await runWithConcurrency(
    selected.map((v) => async () => {
      const [events, trips] = await Promise.all([
        vehiclesApi.getFuelHistory(v.id, startStr, endStr).catch(() => [] as FuelEvent[]),
        vehiclesApi.getTrips(v.id, startStr, end.toISOString()).catch(() => []),
      ]);

      const normal = events
        .filter((e) => e.type === 'normal')
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      const refills = events
        .filter((e) => e.type === 'refill')
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      // Intervalles de trajet pour détecter l'activité
      const tripIntervals = trips.map((t) => ({
        s: new Date(t.start_time).getTime(),
        e: t.end_time
          ? new Date(t.end_time).getTime()
          : new Date(t.start_time).getTime() + (t.duration_seconds ?? 0) * 1000,
        dist: t.distance_km ?? 0,
      }));
      const isActive = (from: number, to: number) => tripIntervals.some((ti) => ti.s < to && ti.e > from);

      const push = (type: string, sev: AnomalySev, detail: string, date: string) =>
        anomalies.push({ vehicle: v, type, sev, detail, date });

      // ── #1 Niveau invalide ────────────────────────────────────────────────
      for (const e of events) {
        if (e.level > 100) push('Niveau invalide', 'CRITIQUE', `Valeur : ${e.level}% (>100%)`, e.timestamp);
        if (e.level < 0) push('Niveau invalide', 'CRITIQUE', `Valeur : ${e.level}% (<0%)`, e.timestamp);
      }

      // ── #2 Spike impulsionnel ─────────────────────────────────────────────
      for (let i = 1; i < normal.length; i++) {
        const prev = normal[i - 1],
          curr = normal[i];
        const delta = Math.abs(curr.level - prev.level);
        const dtMin = (new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 60_000;
        if (delta > 40 && dtMin < 60) {
          const prevTs = new Date(prev.timestamp).getTime();
          const currTs = new Date(curr.timestamp).getTime();
          const explained = events
            .filter((e) => e.type !== 'normal')
            .some((e) => {
              const ts = new Date(e.timestamp).getTime();
              return ts >= prevTs - 5 * 60_000 && ts <= currTs + 5 * 60_000;
            });
          if (!explained)
            push(
              'Spike capteur',
              'CRITIQUE',
              `Saut de ${delta.toFixed(1)}% en ${dtMin.toFixed(0)} min`,
              curr.timestamp
            );
        }
      }

      // ── #3 Variation instable (dent de scie) ──────────────────────────────
      for (let i = 2; i < normal.length - 2; i++) {
        const win = normal.slice(i - 2, i + 3);
        const deltas = win.slice(1).map((e, j) => e.level - win[j].level);
        let dirs = 0;
        for (let j = 1; j < deltas.length; j++) {
          if (Math.sign(deltas[j]) !== Math.sign(deltas[j - 1]) && Math.abs(deltas[j - 1]) > 0.5) dirs++;
        }
        const meanAmp = deltas.reduce((s, d) => s + Math.abs(d), 0) / deltas.length;
        const winDurH = (new Date(win[4].timestamp).getTime() - new Date(win[0].timestamp).getTime()) / 3_600_000;
        if (dirs >= 3 && meanAmp >= 3 && winDurH <= 2) {
          push(
            'Variation instable',
            'SUSPECT',
            `${dirs} inversions, amplitude moy. ${meanAmp.toFixed(1)}% sur ${(winDurH * 60).toFixed(0)} min`,
            win[2].timestamp
          );
          i += 2;
        }
      }

      // ── #4 Capteur gelé ───────────────────────────────────────────────────
      for (let i = 1; i < normal.length; i++) {
        const prev = normal[i - 1],
          curr = normal[i];
        const dtH = (new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 3_600_000;
        if (Math.abs(curr.level - prev.level) <= 0.5 && dtH >= 4) {
          if (isActive(new Date(prev.timestamp).getTime(), new Date(curr.timestamp).getTime()))
            push(
              'Capteur gelé',
              'SUSPECT',
              `Niveau fixe à ${curr.level}% pendant ${dtH.toFixed(1)}h en activité`,
              prev.timestamp
            );
        }
      }

      // ── #5 & #6 Interruption données / GPS inactif ────────────────────────
      for (let i = 1; i < normal.length; i++) {
        const prev = normal[i - 1],
          curr = normal[i];
        const dtH = (new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 3_600_000;
        if (dtH >= 2) {
          const prevTs = new Date(prev.timestamp).getTime();
          const currTs = new Date(curr.timestamp).getTime();
          if (isActive(prevTs, currTs))
            push(
              'Interruption données fuel',
              'SUSPECT',
              `Gap de ${dtH.toFixed(1)}h pendant activité enregistrée`,
              prev.timestamp
            );
          else
            push(
              'GPS inactif (perte fuel)',
              'INFO',
              `Gap de ${dtH.toFixed(1)}h, aucun trajet sur la période`,
              prev.timestamp
            );
        }
      }

      // ── #7 Slow drain (proxy trajets) ─────────────────────────────────────
      const drivingRates: number[] = [];
      for (const ti of tripIntervals) {
        if (ti.dist < 1) continue;
        const during = normal.filter((e) => {
          const ts = new Date(e.timestamp).getTime();
          return ts >= ti.s && ts <= ti.e;
        });
        if (during.length < 2) continue;
        let drop = 0;
        for (let i = 1; i < during.length; i++) {
          const d = during[i - 1].level - during[i].level;
          if (d > 0) drop += d;
        }
        const dh = (ti.e - ti.s) / 3_600_000;
        if (dh > 0 && drop > 0) drivingRates.push(drop / dh);
      }
      const sortedRates = [...drivingRates].sort((a, b) => a - b);
      const medianRate = sortedRates.length ? sortedRates[Math.floor(sortedRates.length / 2)] : 5;
      const sdThreshold = Math.max(medianRate * 0.4, 2);

      for (let i = 1; i < normal.length; i++) {
        const prev = normal[i - 1],
          curr = normal[i];
        const drop = prev.level - curr.level;
        if (drop <= 0) continue;
        const dtH = (new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 3_600_000;
        if (dtH <= 0) continue;
        const rate = drop / dtH;
        if (rate <= sdThreshold) continue;
        if (!isActive(new Date(prev.timestamp).getTime(), new Date(curr.timestamp).getTime()))
          push(
            'Slow drain',
            'CRITIQUE',
            `Perte ${drop.toFixed(1)}% en ${dtH.toFixed(1)}h hors trajet (${rate.toFixed(1)}%/h)`,
            prev.timestamp
          );
      }

      // ── #8 Consommation nocturne ──────────────────────────────────────────
      for (let i = 1; i < normal.length; i++) {
        const prev = normal[i - 1],
          curr = normal[i];
        const drop = prev.level - curr.level;
        if (drop <= 2) continue;
        const pH = new Date(prev.timestamp).getHours();
        const cH = new Date(curr.timestamp).getHours();
        if (pH >= 23 || pH <= 4 || cH >= 23 || cH <= 4)
          push(
            'Consommation nocturne',
            'SUSPECT',
            `Perte ${drop.toFixed(1)}% entre ${fmtTime(prev.timestamp)} et ${fmtTime(curr.timestamp)}`,
            prev.timestamp
          );
      }

      // ── #9 Sur-consommation vs théorique ──────────────────────────────────
      if (v.theoreticalConsumption && v.tankCapacity) {
        for (const ti of tripIntervals) {
          if (ti.dist < 5) continue;
          const during = normal.filter((e) => {
            const ts = new Date(e.timestamp).getTime();
            return ts >= ti.s && ts <= ti.e;
          });
          if (during.length < 2) continue;
          let drop = 0;
          for (let i = 1; i < during.length; i++) {
            const d = during[i - 1].level - during[i].level;
            if (d > 0) drop += d;
          }
          const realL = (drop / 100) * v.tankCapacity;
          const theoL = (ti.dist * v.theoreticalConsumption) / 100;
          if (realL > theoL * 2)
            push(
              'Sur-consommation',
              'SUSPECT',
              `${realL.toFixed(1)} L réels vs ${theoL.toFixed(1)} L théo. sur ${ti.dist.toFixed(1)} km`,
              new Date(ti.s).toISOString()
            );
        }
      }

      // ── #10 Recharge fantôme ──────────────────────────────────────────────
      let prevLvl = normal[0]?.level ?? null;
      for (const r of refills) {
        if (r.volume != null && v.tankCapacity && prevLvl != null) {
          const remaining = (v.tankCapacity * (100 - prevLvl)) / 100;
          if (r.volume > remaining + 5)
            push(
              'Recharge fantôme',
              'CRITIQUE',
              `${r.volume.toFixed(1)} L chargés, capacité restante ≈ ${remaining.toFixed(1)} L (niveau avant : ${prevLvl}%)`,
              r.timestamp
            );
        }
        const near = normal.find(
          (e) => Math.abs(new Date(e.timestamp).getTime() - new Date(r.timestamp).getTime()) < 30 * 60_000
        );
        if (near) prevLvl = near.level;
      }

      // ── #11 Double recharge ───────────────────────────────────────────────
      for (let i = 1; i < refills.length; i++) {
        const prev = refills[i - 1],
          curr = refills[i];
        const dtMin = (new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 60_000;
        if (dtMin < 30)
          push(
            'Double recharge',
            'SUSPECT',
            `2 recharges en ${dtMin.toFixed(0)} min (${(prev.volume ?? 0).toFixed(1)} L + ${(curr.volume ?? 0).toFixed(1)} L)`,
            prev.timestamp
          );
      }
    })
  );

  // Tri : critique d'abord, puis par date desc
  anomalies.sort((a, b) => {
    const sd = SEV_ORDER[a.sev] - SEV_ORDER[b.sev];
    return sd !== 0 ? sd : new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const critiques = anomalies.filter((a) => a.sev === 'CRITIQUE').length;
  const suspects = anomalies.filter((a) => a.sev === 'SUSPECT').length;
  const infos = anomalies.filter((a) => a.sev === 'INFO').length;

  // Chart : count par type d'anomalie
  const typeCounts = anomalies.reduce<Record<string, number>>((acc, a) => {
    acc[a.type] = (acc[a.type] ?? 0) + 1;
    return acc;
  }, {});
  const chartItems = Object.entries(typeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([type, count]) => ({
      label: type.length > 16 ? type.slice(0, 15) + '…' : type,
      value: count,
      color: TYPE_COLOR[type] ?? '#9CA3AF',
    }));

  return {
    title: 'Anomalies carburant',
    kpis: [
      { label: '🔴 Critique', value: String(critiques), color: '#EF4444' },
      { label: '🟡 Suspect', value: String(suspects), color: '#F59E0B' },
      { label: '⚪ Info', value: String(infos), color: '#6B7280' },
      { label: 'Engins', value: String(new Set(anomalies.map((a) => a.vehicle.id)).size), color: '#3B82F6' },
    ],
    columns: ['Sévérité', 'Engin', 'Plaque', 'Type', 'Détail', 'Date', 'Heure', 'Client'],
    rows: anomalies.map((a) => [
      `${SEV_ICON[a.sev]} ${a.sev}`,
      a.vehicle.name,
      a.vehicle.plate,
      a.type,
      a.detail,
      fmtDate(a.date),
      fmtTime(a.date),
      a.vehicle.clientName ?? '—',
    ]),
    chart: chartItems.length
      ? {
          type: 'bar',
          title: 'Anomalies par type (nombre)',
          items: chartItems,
        }
      : undefined,
    note: selected.length >= 20 ? 'Limité aux 20 premiers engins. Affinez la sélection pour voir plus.' : undefined,
  };
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

export async function generateFuelReport(subId: string, vehicles: Vehicle[], f: ReportFilters): Promise<ReportResult> {
  switch (subId) {
    case 'synthese':
      return genFuelSynthese(vehicles, f);
    case 'levels':
      return await genFuelLevels(vehicles, f);
    case 'critical':
      return genFuelCritical(vehicles, f);
    case 'refills':
      return genFuelRefills(vehicles, f);
    case 'drops':
      return genFuelDrops(vehicles, f);
    case 'consumption':
      return genFuelConsumption(vehicles, f);
    case 'vs_theo':
      return genFuelVsTheo(vehicles, f);
    case 'anomalies':
      return genFuelAnomalies(vehicles, f);
    default:
      throw new Error(`Sous-rapport inconnu : ${subId}`);
  }
}
