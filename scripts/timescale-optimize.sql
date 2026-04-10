-- timescale-optimize.sql
-- Optimisations TimescaleDB pour 10 000 devices GPS
--
-- Usage (sur le VPS) :
--   docker exec -i fleet_db psql -U fleet_user -d fleet_db < scripts/timescale-optimize.sql
--
-- Ce script est IDEMPOTENT (peut être rejoué sans risque)
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. Hypertable positions ─────────────────────────────────────────────────
-- Vérifier que la table positions est bien une hypertable TimescaleDB
-- Si ce n'est pas le cas, la convertir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM timescaledb_information.hypertables
    WHERE hypertable_name = 'positions'
  ) THEN
    PERFORM create_hypertable(
      'positions', 'time',
      chunk_time_interval => INTERVAL '1 day',
      if_not_exists => TRUE
    );
    RAISE NOTICE 'Hypertable positions créée';
  ELSE
    RAISE NOTICE 'Hypertable positions déjà existante';
  END IF;
END;
$$;

-- ─── 2. Chunk interval adapté à 10k devices ──────────────────────────────────
-- 10k devices × 2880 paquets/jour = 28.8M rows/jour
-- Chunk 1 jour = ~28M rows → acceptable (optimal entre 10M–100M)
SELECT set_chunk_time_interval('positions', INTERVAL '1 day');

-- ─── 3. Compression automatique (données > 7 jours) ─────────────────────────
-- La compression réduit l'espace disque de 90%+ sur les données historiques
ALTER TABLE positions SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'vehicle_id',
  timescaledb.compress_orderby = 'time DESC'
);

-- Activer la compression automatique après 7 jours
SELECT add_compression_policy('positions', INTERVAL '7 days', if_not_exists => TRUE);

-- ─── 4. Rétention automatique (données > 365 jours) ─────────────────────────
-- Ajuster selon vos besoins de rétention légale/contractuelle
-- SELECT add_retention_policy('positions', INTERVAL '365 days', if_not_exists => TRUE);
-- (Commenté par sécurité — à activer manuellement)

-- ─── 5. Index optimisés ───────────────────────────────────────────────────────
-- Index composé pour les requêtes fréquentes : véhicule + plage temporelle
CREATE INDEX IF NOT EXISTS idx_positions_vehicle_time
  ON positions (vehicle_id, time DESC);

-- Index pour les requêtes de dernière position par véhicule
CREATE INDEX IF NOT EXISTS idx_positions_vehicle_time_brin
  ON positions USING BRIN (vehicle_id, time)
  WITH (pages_per_range = 128);

-- ─── 6. Vues matérialisées continues (agrégats temps réel) ───────────────────
-- Vue horaire pour les rapports de performance (distance, vitesse moy, temps moteur)
CREATE MATERIALIZED VIEW IF NOT EXISTS positions_hourly
WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
SELECT
  time_bucket('1 hour', time) AS bucket,
  vehicle_id,
  COUNT(*)                                    AS points,
  AVG(speed)                                  AS avg_speed,
  MAX(speed)                                  AS max_speed,
  SUM(CASE WHEN ignition THEN 1 ELSE 0 END)   AS ignition_on_count,
  LAST(latitude, time)                        AS last_lat,
  LAST(longitude, time)                       AS last_lng
FROM positions
GROUP BY bucket, vehicle_id
WITH NO DATA;

-- Rafraîchissement toutes les heures (lag 1h pour éviter les données partielles)
SELECT add_continuous_aggregate_policy(
  'positions_hourly',
  start_offset  => INTERVAL '3 hours',
  end_offset    => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour',
  if_not_exists => TRUE
);

-- Vue journalière (pré-agrégée depuis la vue horaire)
CREATE MATERIALIZED VIEW IF NOT EXISTS positions_daily
WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
SELECT
  time_bucket('1 day', bucket) AS day,
  vehicle_id,
  SUM(points)                  AS total_points,
  AVG(avg_speed)               AS avg_speed,
  MAX(max_speed)               AS max_speed,
  SUM(ignition_on_count)       AS total_ignition_points
FROM positions_hourly
GROUP BY day, vehicle_id;

SELECT add_continuous_aggregate_policy(
  'positions_daily',
  start_offset  => INTERVAL '3 days',
  end_offset    => INTERVAL '1 day',
  schedule_interval => INTERVAL '1 day',
  if_not_exists => TRUE
);

-- ─── 7. Paramètres PostgreSQL (via ALTER SYSTEM) ─────────────────────────────
-- Ces paramètres nécessitent un RELOAD (pas de restart)
-- Adaptés pour KVM2 (2 vCPU / 8 GB RAM) — cible 2000 devices / 300 users
--
-- Budget mémoire KVM2 :
--   shared_buffers  2 GB  = 25% RAM (règle PostgreSQL)
--   work_mem       32 MB  × 50 connexions max = 1.6 GB peak (acceptable)
--   OS + Node.js        = ~2.5 GB
--   Redis               = ~256 MB
--   Marge               = ~1.6 GB  → headroom suffisant

ALTER SYSTEM SET shared_buffers              = '2GB';
ALTER SYSTEM SET effective_cache_size        = '5GB';
ALTER SYSTEM SET work_mem                    = '32MB';
ALTER SYSTEM SET maintenance_work_mem        = '256MB';
ALTER SYSTEM SET max_connections             = '50';
ALTER SYSTEM SET checkpoint_completion_target = '0.9';
ALTER SYSTEM SET wal_buffers                 = '64MB';
ALTER SYSTEM SET max_wal_size                = '2GB';
ALTER SYSTEM SET synchronous_commit          = 'off';   -- Perf GPS (positions non critiques)
ALTER SYSTEM SET random_page_cost            = '1.1';   -- NVMe SSD
ALTER SYSTEM SET effective_io_concurrency    = '200';   -- NVMe SSD
ALTER SYSTEM SET timescaledb.max_background_workers = '4';

-- Appliquer sans restart
SELECT pg_reload_conf();

-- ─── 8. Rapport de l'état actuel ─────────────────────────────────────────────
SELECT
  h.hypertable_name,
  h.num_chunks,
  pg_size_pretty(hypertable_size(h.hypertable_name::regclass)) AS total_size,
  pg_size_pretty(hypertable_compression_stats(h.hypertable_name::regclass).after_compression_total_bytes) AS compressed_size
FROM timescaledb_information.hypertables h
WHERE h.hypertable_name IN ('positions')
\gset

-- Résumé
SELECT
  'positions' AS table_name,
  COUNT(*) AS total_rows,
  MIN(time) AS oldest,
  MAX(time) AS newest,
  COUNT(DISTINCT vehicle_id) AS active_vehicles
FROM positions;
