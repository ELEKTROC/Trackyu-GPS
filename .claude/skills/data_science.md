# Skill — Data Science & Analyse TrackYu

## Données disponibles

### Tables principales pour l'analyse

```sql
positions          -- GPS brut : lat, lon, speed, heading, fuel_liters, raw_data (JSONB)
fuel_records       -- Événements carburant : REFILL, THEFT, CORRECTION
alerts             -- Alertes déclenchées : type, sévérité, vehicle_id, timestamp
trips              -- Trajets calculés : start/end, distance_km, duration_min
eco_driving_events -- Événements conduite : HARSH_BRAKE, HARSH_ACCEL, OVERSPEED
maintenance_alerts -- Alertes maintenance : km prévus, km actuels, type
```

### Extensions PostgreSQL disponibles

- **TimescaleDB** — hypertable sur `positions` (partitionnée par `recorded_at`)
- **PostGIS** (à vérifier) — pour les requêtes géographiques

## Requêtes analytiques communes

### Consommation carburant sur période

```sql
SELECT
  o.plate,
  MIN(p.fuel_liters) AS fuel_min,
  MAX(p.fuel_liters) AS fuel_max,
  MAX(p.fuel_liters) - MIN(p.fuel_liters) AS variation,
  COUNT(*) AS nb_points
FROM positions p
JOIN objects o ON o.id = p.object_id
WHERE p.recorded_at BETWEEN $1 AND $2
  AND o.tenant_id = $tenant_id
  AND p.fuel_liters IS NOT NULL
GROUP BY o.id, o.plate
ORDER BY variation DESC;
```

### Détection d'anomalie carburant (chute > 15%)

```sql
WITH fuel_deltas AS (
  SELECT
    object_id,
    recorded_at,
    fuel_liters,
    LAG(fuel_liters) OVER (PARTITION BY object_id ORDER BY recorded_at) AS prev_fuel,
    LAG(recorded_at) OVER (PARTITION BY object_id ORDER BY recorded_at) AS prev_ts
  FROM positions
  WHERE fuel_liters IS NOT NULL
    AND recorded_at > NOW() - INTERVAL '7 days'
)
SELECT *,
  (prev_fuel - fuel_liters) AS delta,
  ROUND(((prev_fuel - fuel_liters) / prev_fuel * 100)::numeric, 1) AS pct_drop
FROM fuel_deltas
WHERE prev_fuel > 0
  AND (prev_fuel - fuel_liters) / prev_fuel > 0.15
  AND EXTRACT(EPOCH FROM (recorded_at - prev_ts)) < 3600  -- dans la même heure
ORDER BY pct_drop DESC;
```

### Temps moteur tournant à l'arrêt (ralenti)

```sql
SELECT
  object_id,
  SUM(duration_seconds) / 3600.0 AS idle_hours,
  COUNT(*) AS idle_segments
FROM (
  SELECT
    object_id,
    recorded_at,
    EXTRACT(EPOCH FROM (
      LEAD(recorded_at) OVER (PARTITION BY object_id ORDER BY recorded_at)
      - recorded_at
    )) AS duration_seconds,
    speed
  FROM positions
  WHERE recorded_at BETWEEN $1 AND $2
) t
WHERE speed < 2 AND duration_seconds BETWEEN 60 AND 7200
GROUP BY object_id;
```

### Distance parcourue par véhicule

```sql
SELECT
  object_id,
  SUM(
    2 * 6371 * ASIN(SQRT(
      POWER(SIN((RADIANS(lat) - RADIANS(LAG(lat) OVER w)) / 2), 2) +
      COS(RADIANS(LAG(lat) OVER w)) * COS(RADIANS(lat)) *
      POWER(SIN((RADIANS(lon) - RADIANS(LAG(lon) OVER w)) / 2), 2)
    ))
  ) AS distance_km
FROM positions
WHERE recorded_at BETWEEN $1 AND $2
WINDOW w AS (PARTITION BY object_id ORDER BY recorded_at)
```

## TimescaleDB — optimisations

```sql
-- Agrégation temporelle (beaucoup plus rapide que GROUP BY)
SELECT time_bucket('1 hour', recorded_at) AS bucket,
       object_id,
       AVG(speed) AS avg_speed,
       MAX(speed) AS max_speed
FROM positions
WHERE recorded_at > NOW() - INTERVAL '24 hours'
GROUP BY bucket, object_id
ORDER BY bucket;

-- Compression (activée sur positions > 7 jours)
SELECT add_compression_policy('positions', INTERVAL '7 days');
```

## Pipeline carburant TrackYu

```
raw_data JSONB → parser protocole → fuel_liters NUMERIC(6,2) → positions
                                                                    ↓
                                                            FuelBlock (gauge)
                                                            FuelModalContent (courbe)
```

### Formule ADC → litres (GT06 / Concox X3)

```
voltage_raw = raw_data.fuel (ex: 5.3V)
pct = (voltage_raw - 0.5) / (3.3 - 0.5) * 100
liters = pct / 100 * tank_capacity_liters
```

## Scoring éco-conduite

```typescript
// Algorithme actuel dans leadScoringController
score = 100 - harsh_brakes * 5 - harsh_accels * 3 - overspeed_events * 10 - idle_hours * 2;
// Score min: 0, max: 100
```

## Détection de vol carburant

Indicateurs combinés :

1. Chute fuel_liters > 10% en < 30 min **sans** mouvement (speed = 0)
2. Pas d'événement REFILL dans `fuel_records` sur la même période
3. Heure : nuit (22h–6h) — coefficient aggravant

```sql
-- Événements suspects de vol
SELECT p.object_id, p.recorded_at, p.fuel_liters,
       prev.fuel_liters AS prev_fuel,
       (prev.fuel_liters - p.fuel_liters) AS delta_liters
FROM positions p
JOIN LATERAL (
  SELECT fuel_liters, recorded_at
  FROM positions p2
  WHERE p2.object_id = p.object_id
    AND p2.recorded_at < p.recorded_at
    AND p2.fuel_liters IS NOT NULL
  ORDER BY p2.recorded_at DESC LIMIT 1
) prev ON true
WHERE p.fuel_liters IS NOT NULL
  AND prev.fuel_liters - p.fuel_liters > 5  -- > 5 litres perdus
  AND p.speed < 2                            -- véhicule à l'arrêt
  AND NOT EXISTS (
    SELECT 1 FROM fuel_records fr
    WHERE fr.vehicle_id = p.object_id
      AND fr.type = 'REFILL'
      AND ABS(EXTRACT(EPOCH FROM (fr.date - p.recorded_at))) < 1800
  )
ORDER BY delta_liters DESC;
```

## Analyse de flotte pour rapports

### KPIs standards

| KPI                   | Formule                                 |
| --------------------- | --------------------------------------- |
| Taux d'utilisation    | Heures mouvement / Heures totales × 100 |
| Consommation L/100km  | Litres consommés / Distance × 100       |
| Score éco-conduite    | 0–100, pondéré par événements           |
| Taux de disponibilité | (Heures – Pannes) / Heures × 100        |

### Rapport automatique quotidien (à implémenter)

```typescript
// Structure recommandée pour l'IA assistant
const dailyReport = {
  date: today,
  fleet: { total: n, active: n, offline: n },
  topAlerts: alerts.slice(0, 5),
  fuelAnomalies: suspectedThefts,
  bestEcoScore: vehicleRanking[0],
  worstEcoScore: vehicleRanking.at(-1),
};
```

## Export et visualisation

- CSV exports : via `Papa.unparse()` côté frontend
- Graphiques : Recharts (LineChart, BarChart, PieChart)
- Cartes : Leaflet + OpenStreetMap (pas Google Maps — coûts)
- Tableaux : pagination côté serveur (jamais tout charger en mémoire)

## Règle fondamentale

**Tous les calculs = serveur uniquement.** Le client ne recalcule pas les stats, distances, niveaux carburant — il affiche ce que l'API retourne. Voir `feedback_single_source_of_truth.md`.
