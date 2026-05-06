# Skill — Bases de données TrackYu

## Stack

- **PostgreSQL 14 + TimescaleDB** — données séries temporelles (positions GPS)
- **Redis 7** — cache, queue GPS (`gps_incoming_queue`), sessions
- **Docker** sur VPS 148.230.126.62

## Connexion

```bash
# Depuis VPS
docker exec trackyu-gps-postgres-1 psql 'postgres://fleet_user:fleet_password@localhost:5432/fleet_db'
```

## Tables critiques

| Table                | Usage                                                    | Clé de partitionnement          |
| -------------------- | -------------------------------------------------------- | ------------------------------- |
| `positions`          | Historique GPS temps réel                                | `time` (TimescaleDB hypertable) |
| `objects`            | Véhicules/trackers (statut live, IMEI, fuel_level)       | `id`                            |
| `fuel_records`       | Événements REFILL/THEFT manuels                          | `vehicle_id`                    |
| `fuel_events`        | Événements carburant auto-détectés (Phase 4, 2026-04-24) | `object_id`                     |
| `tenants`            | Isolation multi-tenant                                   | `id`                            |
| `users`              | Comptes avec `tenant_id`                                 | `tenant_id`                     |
| `subscriptions`      | Abonnements (1 par véhicule)                             | `object_id`                     |
| `alerts`             | Alertes déclenchées                                      | `object_id`, `created_at`       |
| `discovered_devices` | IMEIs inconnus connectés                                 | `imei`                          |

### Colonnes carburant — `objects`

| Colonne         | Type         | Default                      | Notes                                                                                                                                                                       |
| --------------- | ------------ | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fuel_level`    | INTEGER NULL | **NULL** (changé 2026-05-05) | % carburant live. NULL = aucune donnée réelle (capteur absent ou jamais reçu). Anciennement DEFAULT 100 ce qui créait des faux "plein" sur tous les véhicules sans capteur. |
| `tank_capacity` | NUMERIC      | NULL                         | Litres. Si NULL/0 → fallback 350L côté backend pour JT808 BLE.                                                                                                              |
| `device_model`  | VARCHAR      | NULL                         | Discriminant pipeline fuel. `'JT808 BLE'` → bypass ADC.                                                                                                                     |
| `sensor_config` | JSONB        | NULL                         | `{factor, v_empty_mv, v_full_mv}`. Doit être dans le SELECT cacheService pour que positionWorker l'ait.                                                                     |

### Colonnes carburant — `positions`

| Colonne       | Type          | Notes                                                |
| ------------- | ------------- | ---------------------------------------------------- |
| `fuel_liters` | DECIMAL(10,2) | Valeur convertie après calibration/bypass            |
| `fuel_raw`    | INTEGER       | Brut capteur : mV pour ADC, uint16×10 pour JT808 BLE |

## Patterns d'accès courants

```sql
-- Dernières positions d'un véhicule (24h)
SELECT time, latitude, longitude, speed, fuel_liters
FROM positions
WHERE object_id = $1 AND time >= NOW() - INTERVAL '24 hours'
ORDER BY time ASC;

-- Niveau carburant actuel
SELECT fuel_liters, time FROM positions
WHERE object_id = $1 AND fuel_liters IS NOT NULL
ORDER BY time DESC LIMIT 1;

-- Statut live de tous les véhicules d'un tenant
SELECT id, name, status, speed, fuel_level, updated_at
FROM objects WHERE tenant_id = $1 AND is_active = true;
```

## Isolation tenant — règle absolue

**Toute requête doit filtrer par `tenant_id`** sauf pour SUPERADMIN/TKY.

```sql
-- CORRECT
WHERE tenant_id = $1 AND ...

-- DANGEREUX — fuite cross-tenant
WHERE id = $1  -- sans tenant_id
```

## Migrations

- Fichiers dans `trackyu-backend/src/db/migrations/`
- Format : `YYYYMMDD_description.sql`
- Deploy : `.\deploy.ps1 -backend -migrate`
- Ne jamais modifier une migration déjà appliquée en prod — créer une nouvelle

## Performances

- Index critiques : `positions(object_id, time DESC)`, `objects(tenant_id)`, `objects(imei)`
- TimescaleDB chunk interval : 1 jour sur `positions`
- Bulk insert positions : toutes les 2s (buffer en mémoire)
- Requêtes N+1 : utiliser des JOINs ou batch queries, jamais de boucle SQL

## Backups

- pg_dump quotidien à 3h15 (scripts `/usr/local/bin/trackyu-db-*.sh`)
- Rétention 14 jours
- Snapshot Hostinger hebdomadaire

---

## Rapports liés (docs/)

Voir l'index complet dans [`docs/README.md`](../../docs/README.md). Rapports pertinents pour ce skill : `docs/backend/SRC_DIST_INVENTORY.md` (inventaire src/dist).

> ⚠️ Ces rapports peuvent être obsolètes — vérifier la date avant de s'y fier. En cas de contradiction avec le code ou la prod, c'est le code/prod qui fait foi.
>
> **Tout nouveau rapport doit être rangé dans `docs/<thème>/`** selon l'organisation décrite dans `docs/README.md`.
