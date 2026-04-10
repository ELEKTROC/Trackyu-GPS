-- Migration GPS Précision — 2026-04-03
-- Ajoute les tables et colonnes nécessaires pour le chantier GPS précision

-- ─── Table positions (si elle n'existe pas) ────────────────────────────────
CREATE TABLE IF NOT EXISTS positions (
    id          BIGSERIAL PRIMARY KEY,
    vehicle_id  TEXT NOT NULL,
    latitude    DOUBLE PRECISION NOT NULL,
    longitude   DOUBLE PRECISION NOT NULL,
    speed       DOUBLE PRECISION NOT NULL DEFAULT 0,
    heading     DOUBLE PRECISION NOT NULL DEFAULT 0,
    time        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fuel_liters DECIMAL(8,2),
    ignition    BOOLEAN NOT NULL DEFAULT false,
    raw_data    TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index performances (lookup par véhicule et plage de temps)
CREATE INDEX IF NOT EXISTS idx_positions_vehicle_time ON positions(vehicle_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_positions_time ON positions(time DESC);

-- ─── Colonne fuelSmoothingAlpha sur vehicles ───────────────────────────────
-- Permet de configurer l'alpha de lissage du carburant par véhicule
ALTER TABLE vehicles
    ADD COLUMN IF NOT EXISTS fuel_smoothing_alpha DECIMAL(3,2) DEFAULT 0.3
        CHECK (fuel_smoothing_alpha >= 0.05 AND fuel_smoothing_alpha <= 1.0);

-- ─── Table device_commands — historique commandes envoyées ──────────────────
CREATE TABLE IF NOT EXISTS device_commands (
    id          BIGSERIAL PRIMARY KEY,
    imei        VARCHAR(16) NOT NULL,
    type        VARCHAR(50) NOT NULL,    -- CUT_ENGINE, PING, REBOOT, etc.
    protocol    VARCHAR(30) NOT NULL,    -- GT06, TELTONIKA, etc.
    payload_hex TEXT,                    -- Commande brute en hex (pour audit)
    sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    success     BOOLEAN NOT NULL DEFAULT false,
    error_msg   TEXT,
    sent_by     TEXT                     -- ID utilisateur qui a envoyé la commande
);

CREATE INDEX IF NOT EXISTS idx_device_commands_imei ON device_commands(imei, sent_at DESC);

-- ─── Table discovered_devices — boîtiers détectés mais non enregistrés ──────
CREATE TABLE IF NOT EXISTS discovered_devices (
    id            BIGSERIAL PRIMARY KEY,
    imei          VARCHAR(16) NOT NULL UNIQUE,
    protocol      VARCHAR(30),
    remote_ip     INET,
    first_seen    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    packet_count  INTEGER NOT NULL DEFAULT 1,
    status        VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, IGNORED
    notes         TEXT
);

CREATE INDEX IF NOT EXISTS idx_discovered_devices_status ON discovered_devices(status, last_seen DESC);

-- ─── Vue diagnostics boîtiers (utilisée par /api/admin/devices/:imei/diagnostics) ──
CREATE OR REPLACE VIEW v_device_diagnostics AS
SELECT
    ds.imei,
    ds.model AS device_model,
    ds.status AS device_status,
    ds.assigned_vehicle_id,
    v.name AS vehicle_name,
    v.plate AS vehicle_plate,
    v.tenant_id,
    v.fuel_smoothing_alpha,
    (
        SELECT p.time
        FROM positions p
        WHERE p.vehicle_id = v.id
        ORDER BY p.time DESC
        LIMIT 1
    ) AS last_fix,
    (
        SELECT COUNT(*)
        FROM positions p
        WHERE p.vehicle_id = v.id
          AND p.time >= CURRENT_DATE
    ) AS packets_today,
    (
        SELECT p.raw_data::json->>'protocol'
        FROM positions p
        WHERE p.vehicle_id = v.id
        ORDER BY p.time DESC
        LIMIT 1
    ) AS last_protocol
FROM device_stock ds
LEFT JOIN vehicles v ON ds.assigned_vehicle_id = v.id
WHERE ds.type = 'BOX';

-- ─── Trigger : mise à jour discovered_devices à l'arrivée d'un IMEI inconnu ─
-- (Géré côté application, pas en trigger SQL pour éviter la complexité)

-- ─── Commentaires ─────────────────────────────────────────────────────────────
COMMENT ON COLUMN vehicles.fuel_smoothing_alpha IS
    'Coefficient alpha du filtre exponentiel carburant [0.05-1.0]. 0.3=défaut, 0.1=très lisse, 1.0=brut';

COMMENT ON TABLE device_commands IS
    'Historique de toutes les commandes envoyées aux boîtiers GPS (audit, debug)';

COMMENT ON TABLE discovered_devices IS
    'Boîtiers GPS détectés sur le serveur TCP mais non encore enregistrés dans le stock';
