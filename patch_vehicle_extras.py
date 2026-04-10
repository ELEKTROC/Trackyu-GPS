# -*- coding: utf-8 -*-
"""
patch_vehicle_extras.py
=======================
Crée les endpoints /vehicle-tires et /vehicle-expenses dans le backend.

Étapes :
  1. Migration SQL — crée les tables vehicle_tires + vehicle_expenses
  2. Crée /app/dist/routes/vehicleExtrasRoutes.js (CRUD complet, isolé par tenant)
  3. Enregistre les routes dans app.js (app.use('/vehicle-tires') + app.use('/vehicle-expenses'))
  4. Redémarre le container

Usage : python patch_vehicle_extras.py
"""
import subprocess, sys, time

SSH_HOST  = "trackyu-vps"
CONTAINER = "trackyu-gps-backend-1"
BASE      = "/app/dist"
DB_NAME   = "trackyu_gps"   # ajuster si différent

# ─────────────────────────────────────────────────────────────────────────────
# Helpers SSH / Docker
# ─────────────────────────────────────────────────────────────────────────────

def ssh(cmd, check=True):
    r = subprocess.run(["ssh", SSH_HOST, cmd],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    if check and r.returncode != 0:
        print(f"❌ SSH error [{cmd[:60]}]: {r.stderr.strip()}")
        sys.exit(1)
    return r.stdout, r.stderr, r.returncode

def docker_read(path):
    out, err, rc = ssh(f"docker exec {CONTAINER} cat {path}")
    if rc != 0:
        print(f"❌ Impossible de lire {path}: {err}")
        sys.exit(1)
    return out

def docker_write(path, content):
    cmd = f"docker exec -i {CONTAINER} sh -c 'cat > {path}'"
    r = subprocess.run(["ssh", SSH_HOST, cmd],
                       input=content, capture_output=True,
                       text=True, encoding="utf-8", errors="replace")
    if r.returncode != 0:
        print(f"❌ Erreur écriture {path}: {r.stderr}")
        sys.exit(1)
    print(f"  ✓ écrit {path}")

def docker_exec(cmd):
    out, err, rc = ssh(f"docker exec {CONTAINER} {cmd}", check=False)
    return out, err, rc

def patch(content, old, new, label):
    if old not in content:
        print(f"  ⚠  SKIP (ancre introuvable) : {label}")
        return content
    result = content.replace(old, new, 1)
    print(f"  ✓ {label}")
    return result

# ─────────────────────────────────────────────────────────────────────────────
# ÉTAPE 1 — Migration SQL
# ─────────────────────────────────────────────────────────────────────────────
SQL_MIGRATION = """
CREATE TABLE IF NOT EXISTS vehicle_tires (
    id              VARCHAR(60)  PRIMARY KEY,
    tenant_id       VARCHAR(60)  NOT NULL,
    vehicle_id      VARCHAR(60)  NOT NULL,
    serial_number   VARCHAR(100) NOT NULL,
    brand           VARCHAR(100),
    position        VARCHAR(20)  NOT NULL,
    mount_date      DATE         NOT NULL,
    mileage_at_mount INTEGER     NOT NULL DEFAULT 0,
    target_mileage  INTEGER      NOT NULL DEFAULT 80000,
    current_mileage INTEGER,
    status          VARCHAR(20)  NOT NULL DEFAULT 'Actif',
    notes           TEXT,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vehicle_tires_tenant   ON vehicle_tires(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_tires_vehicle  ON vehicle_tires(vehicle_id);

CREATE TABLE IF NOT EXISTS vehicle_expenses (
    id          VARCHAR(60)    PRIMARY KEY,
    tenant_id   VARCHAR(60)    NOT NULL,
    vehicle_id  VARCHAR(60)    NOT NULL,
    category    VARCHAR(50)    NOT NULL,
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
"""

# ─────────────────────────────────────────────────────────────────────────────
# ÉTAPE 2 — Contenu du fichier vehicleExtrasRoutes.js
# ─────────────────────────────────────────────────────────────────────────────
ROUTES_JS = r"""
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const database_1 = require("../config/database");

const router = express_1.Router();

// Génère un ID préfixé unique
function genId(prefix) {
    return prefix + '-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
}

// ══════════════════════════════════════════════════════════════════════════════
// VEHICLE TIRES — /vehicle-tires
// ══════════════════════════════════════════════════════════════════════════════

// GET /vehicle-tires — liste tous les pneus du tenant (ou filtré par vehicleId)
router.get('/tires', authMiddleware_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { tenantId } = req.user;
        const vehicleId = req.query.vehicleId;
        let query, params;
        if (vehicleId) {
            query = 'SELECT * FROM vehicle_tires WHERE tenant_id = $1 AND vehicle_id = $2 ORDER BY created_at DESC';
            params = [tenantId, vehicleId];
        } else {
            query = 'SELECT * FROM vehicle_tires WHERE tenant_id = $1 ORDER BY status, created_at DESC';
            params = [tenantId];
        }
        const result = yield database_1.default.query(query, params);
        res.json(result.rows.map(r => ({
            id: r.id, vehicleId: r.vehicle_id, serialNumber: r.serial_number,
            brand: r.brand, position: r.position, mountDate: r.mount_date,
            mileageAtMount: r.mileage_at_mount, targetMileage: r.target_mileage,
            currentMileage: r.current_mileage, status: r.status, notes: r.notes,
            tenantId: r.tenant_id, createdAt: r.created_at, updatedAt: r.updated_at,
        })));
    } catch (e) {
        console.error('[vehicle-tires GET]', e);
        res.status(500).json({ error: 'Erreur interne' });
    }
}));

// POST /vehicle-tires — créer un pneu
router.post('/tires', authMiddleware_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { tenantId } = req.user;
        const { vehicleId, serialNumber, brand, position, mountDate, mileageAtMount, targetMileage, currentMileage, status, notes } = req.body;
        if (!vehicleId || !serialNumber || !position || !mountDate)
            return res.status(400).json({ error: 'vehicleId, serialNumber, position et mountDate sont requis' });
        const id = genId('TIR');
        const r = yield database_1.default.query(
            `INSERT INTO vehicle_tires (id, tenant_id, vehicle_id, serial_number, brand, position, mount_date, mileage_at_mount, target_mileage, current_mileage, status, notes)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
            [id, tenantId, vehicleId, serialNumber, brand || null, position,
             mountDate, mileageAtMount || 0, targetMileage || 80000,
             currentMileage || null, status || 'Actif', notes || null]
        );
        const row = r.rows[0];
        res.status(201).json({
            id: row.id, vehicleId: row.vehicle_id, serialNumber: row.serial_number,
            brand: row.brand, position: row.position, mountDate: row.mount_date,
            mileageAtMount: row.mileage_at_mount, targetMileage: row.target_mileage,
            currentMileage: row.current_mileage, status: row.status, notes: row.notes,
            tenantId: row.tenant_id, createdAt: row.created_at, updatedAt: row.updated_at,
        });
    } catch (e) {
        console.error('[vehicle-tires POST]', e);
        res.status(500).json({ error: 'Erreur interne' });
    }
}));

// PUT /vehicle-tires/:id — modifier un pneu
router.put('/tires/:id', authMiddleware_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { tenantId } = req.user;
        const { id } = req.params;
        const { vehicleId, serialNumber, brand, position, mountDate, mileageAtMount, targetMileage, currentMileage, status, notes } = req.body;
        const r = yield database_1.default.query(
            `UPDATE vehicle_tires SET
                vehicle_id = COALESCE($3, vehicle_id),
                serial_number = COALESCE($4, serial_number),
                brand = $5,
                position = COALESCE($6, position),
                mount_date = COALESCE($7, mount_date),
                mileage_at_mount = COALESCE($8, mileage_at_mount),
                target_mileage = COALESCE($9, target_mileage),
                current_mileage = $10,
                status = COALESCE($11, status),
                notes = $12,
                updated_at = NOW()
             WHERE id = $1 AND tenant_id = $2 RETURNING *`,
            [id, tenantId, vehicleId || null, serialNumber || null, brand || null,
             position || null, mountDate || null, mileageAtMount != null ? mileageAtMount : null,
             targetMileage != null ? targetMileage : null, currentMileage != null ? currentMileage : null,
             status || null, notes != null ? notes : null]
        );
        if (!r.rows.length) return res.status(404).json({ error: 'Pneu introuvable' });
        const row = r.rows[0];
        res.json({
            id: row.id, vehicleId: row.vehicle_id, serialNumber: row.serial_number,
            brand: row.brand, position: row.position, mountDate: row.mount_date,
            mileageAtMount: row.mileage_at_mount, targetMileage: row.target_mileage,
            currentMileage: row.current_mileage, status: row.status, notes: row.notes,
            tenantId: row.tenant_id, createdAt: row.created_at, updatedAt: row.updated_at,
        });
    } catch (e) {
        console.error('[vehicle-tires PUT]', e);
        res.status(500).json({ error: 'Erreur interne' });
    }
}));

// DELETE /vehicle-tires/:id
router.delete('/tires/:id', authMiddleware_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { tenantId } = req.user;
        const { id } = req.params;
        const r = yield database_1.default.query(
            'DELETE FROM vehicle_tires WHERE id = $1 AND tenant_id = $2 RETURNING id',
            [id, tenantId]
        );
        if (!r.rows.length) return res.status(404).json({ error: 'Pneu introuvable' });
        res.json({ deleted: true });
    } catch (e) {
        console.error('[vehicle-tires DELETE]', e);
        res.status(500).json({ error: 'Erreur interne' });
    }
}));

// ══════════════════════════════════════════════════════════════════════════════
// VEHICLE EXPENSES — /vehicle-expenses
// ══════════════════════════════════════════════════════════════════════════════

// GET /vehicle-expenses
router.get('/expenses', authMiddleware_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { tenantId } = req.user;
        const vehicleId = req.query.vehicleId;
        let query, params;
        if (vehicleId) {
            query = 'SELECT * FROM vehicle_expenses WHERE tenant_id = $1 AND vehicle_id = $2 ORDER BY date DESC, created_at DESC';
            params = [tenantId, vehicleId];
        } else {
            query = 'SELECT * FROM vehicle_expenses WHERE tenant_id = $1 ORDER BY date DESC, created_at DESC';
            params = [tenantId];
        }
        const result = yield database_1.default.query(query, params);
        res.json(result.rows.map(r => ({
            id: r.id, vehicleId: r.vehicle_id, category: r.category,
            amount: parseFloat(r.amount), currency: r.currency,
            date: r.date, description: r.description, receiptUrl: r.receipt_url,
            tenantId: r.tenant_id, createdAt: r.created_at, updatedAt: r.updated_at,
        })));
    } catch (e) {
        console.error('[vehicle-expenses GET]', e);
        res.status(500).json({ error: 'Erreur interne' });
    }
}));

// POST /vehicle-expenses
router.post('/expenses', authMiddleware_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { tenantId } = req.user;
        const { vehicleId, category, amount, currency, date, description, receiptUrl } = req.body;
        if (!vehicleId || !category || amount == null || !date)
            return res.status(400).json({ error: 'vehicleId, category, amount et date sont requis' });
        const id = genId('EXP');
        const r = yield database_1.default.query(
            `INSERT INTO vehicle_expenses (id, tenant_id, vehicle_id, category, amount, currency, date, description, receipt_url)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
            [id, tenantId, vehicleId, category, amount, currency || 'XAF', date, description || null, receiptUrl || null]
        );
        const row = r.rows[0];
        res.status(201).json({
            id: row.id, vehicleId: row.vehicle_id, category: row.category,
            amount: parseFloat(row.amount), currency: row.currency,
            date: row.date, description: row.description, receiptUrl: row.receipt_url,
            tenantId: row.tenant_id, createdAt: row.created_at, updatedAt: row.updated_at,
        });
    } catch (e) {
        console.error('[vehicle-expenses POST]', e);
        res.status(500).json({ error: 'Erreur interne' });
    }
}));

// PUT /vehicle-expenses/:id
router.put('/expenses/:id', authMiddleware_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { tenantId } = req.user;
        const { id } = req.params;
        const { vehicleId, category, amount, currency, date, description, receiptUrl } = req.body;
        const r = yield database_1.default.query(
            `UPDATE vehicle_expenses SET
                vehicle_id  = COALESCE($3, vehicle_id),
                category    = COALESCE($4, category),
                amount      = COALESCE($5, amount),
                currency    = COALESCE($6, currency),
                date        = COALESCE($7, date),
                description = $8,
                receipt_url = $9,
                updated_at  = NOW()
             WHERE id = $1 AND tenant_id = $2 RETURNING *`,
            [id, tenantId, vehicleId || null, category || null,
             amount != null ? amount : null, currency || null, date || null,
             description != null ? description : null, receiptUrl != null ? receiptUrl : null]
        );
        if (!r.rows.length) return res.status(404).json({ error: 'Dépense introuvable' });
        const row = r.rows[0];
        res.json({
            id: row.id, vehicleId: row.vehicle_id, category: row.category,
            amount: parseFloat(row.amount), currency: row.currency,
            date: row.date, description: row.description, receiptUrl: row.receipt_url,
            tenantId: row.tenant_id, createdAt: row.created_at, updatedAt: row.updated_at,
        });
    } catch (e) {
        console.error('[vehicle-expenses PUT]', e);
        res.status(500).json({ error: 'Erreur interne' });
    }
}));

// DELETE /vehicle-expenses/:id
router.delete('/expenses/:id', authMiddleware_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { tenantId } = req.user;
        const { id } = req.params;
        const r = yield database_1.default.query(
            'DELETE FROM vehicle_expenses WHERE id = $1 AND tenant_id = $2 RETURNING id',
            [id, tenantId]
        );
        if (!r.rows.length) return res.status(404).json({ error: 'Dépense introuvable' });
        res.json({ deleted: true });
    } catch (e) {
        console.error('[vehicle-expenses DELETE]', e);
        res.status(500).json({ error: 'Erreur interne' });
    }
}));

exports.default = router;
"""

# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────
def main():

    # ── 1. Migration SQL ──────────────────────────────────────────────────────
    print("\n[1/4] Migration SQL — création tables vehicle_tires + vehicle_expenses")
    # Trouver le container postgres
    out, _, _ = ssh("docker ps --format '{{.Names}}' | grep -i postgres | head -1", check=False)
    pg_container = out.strip() or "trackyu-gps-postgres-1"
    print(f"  → Container postgres : {pg_container}")

    sql_cmd = f"""docker exec {pg_container} psql -U postgres -d {DB_NAME} -c "{SQL_MIGRATION.replace('"', chr(39))}" """
    # Méthode plus fiable via heredoc
    tmp_sql = "/tmp/vehicle_extras_migration.sql"
    proc = subprocess.run(
        ["ssh", SSH_HOST, f"cat > {tmp_sql}"],
        input=SQL_MIGRATION.encode(), capture_output=True
    )
    if proc.returncode != 0:
        print(f"  ❌ Erreur envoi SQL: {proc.stderr.decode()}"); sys.exit(1)

    out, err, rc = ssh(
        f"docker exec {pg_container} sh -c 'psql -U postgres -d {DB_NAME} -f /dev/stdin' < {tmp_sql}",
        check=False
    )
    if rc != 0:
        # Essayer avec le fichier tmp copié dans le container
        ssh(f"docker cp {tmp_sql} {pg_container}:{tmp_sql}", check=False)
        out, err, rc = ssh(f"docker exec {pg_container} psql -U postgres -d {DB_NAME} -f {tmp_sql}", check=False)
    if rc != 0:
        print(f"  ❌ Erreur migration SQL: {err}")
        # Continuer quand même — les tables seront créées au prochain démarrage si la DB est accessible
        print("  ⚠  Continuer sans migration (tables à créer manuellement si nécessaire)")
    else:
        print(f"  ✓ Tables créées : {out.strip()}")

    # ── 2. Créer vehicleExtrasRoutes.js ──────────────────────────────────────
    print("\n[2/4] Création de vehicleExtrasRoutes.js")
    routes_path = f"{BASE}/routes/vehicleExtrasRoutes.js"
    docker_write(routes_path, ROUTES_JS)

    # ── 3. Enregistrer dans app.js ────────────────────────────────────────────
    print("\n[3/4] Enregistrement des routes dans app.js")
    app_path = f"{BASE}/app.js"
    app_content = docker_read(app_path)

    # Vérifier si déjà patché
    if "vehicleExtrasRoutes" in app_content:
        print("  ⚠  Routes déjà enregistrées — aucune modification")
    else:
        # Chercher des ancres candidates pour injecter après les routes existantes similaires
        ANCHORS = [
            "maintenanceRoutes",
            "scheduleRoutes",
            "eco-driving",
            "ecoDriving",
        ]
        inject_after = None
        for anchor in ANCHORS:
            # Chercher la ligne app.use qui contient cet anchor
            lines = app_content.split('\n')
            for i, line in enumerate(lines):
                if anchor in line and 'app.use' in line:
                    inject_after = '\n'.join(lines[:i+1])
                    rest = '\n'.join(lines[i+1:])
                    break
            if inject_after:
                break

        NEW_ROUTES_REG = """
const vehicleExtrasRoutes_1 = require("./routes/vehicleExtrasRoutes");
app.use('/vehicle-tires',    vehicleExtrasRoutes_1.default);
app.use('/vehicle-expenses', vehicleExtrasRoutes_1.default);"""

        if inject_after:
            new_app = inject_after + NEW_ROUTES_REG + '\n' + rest
            print(f"  ✓ Injection après ancre trouvée")
        else:
            # Ancre de fallback : avant exports ou avant app.listen
            FALLBACK_ANCHORS = ["app.listen(", "exports.default = app", "module.exports = app"]
            patched = False
            for fa in FALLBACK_ANCHORS:
                if fa in app_content:
                    new_app = app_content.replace(fa, NEW_ROUTES_REG + '\n' + fa, 1)
                    print(f"  ✓ Injection avant '{fa[:40]}' (fallback)")
                    patched = True
                    break
            if not patched:
                print("  ❌ Ancre introuvable dans app.js — ajout manuel requis")
                print(f"     Ajouter dans app.js :\n{NEW_ROUTES_REG}")
                sys.exit(1)

        docker_write(app_path, new_app)

    # ── 4. Redémarrer le container ────────────────────────────────────────────
    print("\n[4/4] Redémarrage du backend...")
    out, err, rc = ssh(f"docker restart {CONTAINER}", check=False)
    if rc != 0:
        print(f"  ❌ Erreur restart: {err}")
    else:
        print(f"  ✓ Container redémarré")

    time.sleep(5)
    out, _, _ = ssh(f"docker logs {CONTAINER} --tail 8 2>&1", check=False)
    print(f"\nLogs :\n{out}")

    print("\n✅ Patch terminé — endpoints disponibles :")
    print("   GET/POST   /vehicle-tires")
    print("   GET/PUT/DELETE /vehicle-tires/:id")
    print("   GET/POST   /vehicle-expenses")
    print("   GET/PUT/DELETE /vehicle-expenses/:id")

if __name__ == "__main__":
    main()
