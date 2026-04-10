-- Migration: vehicle_tires + vehicle_expenses
-- Date: 2026-04-09

-- ──────────────────────────────────────────────
-- TABLE: vehicle_tires
-- Suivi cycle de vie des pneus par véhicule
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicle_tires (
    id              VARCHAR(60)  PRIMARY KEY,
    tenant_id       VARCHAR(60)  NOT NULL,
    vehicle_id      VARCHAR(60)  NOT NULL,
    serial_number   VARCHAR(100) NOT NULL,
    brand           VARCHAR(100),
    position        VARCHAR(20)  NOT NULL,       -- AV.G / AV.D / AR.G / AR.D / E1.GE / E1.GI ...
    mount_date      DATE         NOT NULL,
    mileage_at_mount INTEGER     NOT NULL DEFAULT 0,
    target_mileage  INTEGER      NOT NULL DEFAULT 80000,
    current_mileage INTEGER,
    status          VARCHAR(20)  NOT NULL DEFAULT 'Actif',  -- Actif / Remplacé / Hors service
    notes           TEXT,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_tires_tenant   ON vehicle_tires(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_tires_vehicle  ON vehicle_tires(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_tires_status   ON vehicle_tires(status);

-- ──────────────────────────────────────────────
-- TABLE: vehicle_expenses
-- Suivi des dépenses par véhicule
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicle_expenses (
    id          VARCHAR(60)    PRIMARY KEY,
    tenant_id   VARCHAR(60)    NOT NULL,
    vehicle_id  VARCHAR(60)    NOT NULL,
    category    VARCHAR(50)    NOT NULL,   -- Carburant / Péage / Réparation / Assurance / Entretien / Lavage / Amende / Autre
    amount      NUMERIC(12, 2) NOT NULL,
    currency    VARCHAR(10)    NOT NULL DEFAULT 'XAF',
    date        DATE           NOT NULL,
    description TEXT,
    receipt_url VARCHAR(500),
    created_at  TIMESTAMP      NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP      NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_expenses_tenant  ON vehicle_expenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_expenses_vehicle ON vehicle_expenses(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_expenses_date    ON vehicle_expenses(date);
CREATE INDEX IF NOT EXISTS idx_vehicle_expenses_cat     ON vehicle_expenses(category);
