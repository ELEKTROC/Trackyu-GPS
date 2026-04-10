"""
Patch: ajoute GET/PUT /portal/alert-preferences à portalRoutes.js

Permet au CLIENT de lire et configurer ses seuils d'alertes simples :
  - Vitesse (SPEED_LIMIT) — seuil km/h + actif/inactif
  - Carburant (FUEL_LOW)  — seuil % + actif/inactif  (évaluation Phase 2)
  - Hors ligne (OFFLINE)  — délai min + actif/inactif  (évaluation Phase 2)

Stockage : table schedule_rules (lu par ruleEvaluationService en temps réel)
Cache : 5 min — nouvelles règles actives sous 5 min après PUT
"""
import subprocess, sys

REMOTE = "root@148.230.126.62"
FILE   = "/var/www/trackyu-gps/backend/dist/routes/portalRoutes.js"
CONTAINER = "trackyu-gps-backend-1"

# ── Code à injecter ────────────────────────────────────────────────────────────
NEW_ROUTES = r"""
// ─────────────────────────────────────────────────────────────────────────────
// GET /portal/alert-preferences
// Retourne les préférences d'alertes simples du CLIENT (vitesse / carburant / offline)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/alert-preferences', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { tenantId } = req.user;
        const result = yield database_1.default.query(
            "SELECT type, schedule, is_active FROM schedule_rules WHERE tenant_id = $1 AND type IN ('SPEED_LIMIT', 'FUEL_LOW', 'OFFLINE')",
            [tenantId]
        );
        const byType = {};
        for (const row of result.rows) {
            byType[row.type] = { schedule: row.schedule || {}, is_active: row.is_active };
        }
        const speedCfg   = (byType['SPEED_LIMIT']  || {}).schedule  || {};
        const fuelCfg    = (byType['FUEL_LOW']      || {}).schedule  || {};
        const offlineCfg = (byType['OFFLINE']       || {}).schedule  || {};
        res.json({
            speed: {
                enabled:   byType['SPEED_LIMIT']  ? (byType['SPEED_LIMIT'].is_active  || false) : false,
                threshold: (speedCfg.speedLimit   || {}).maxSpeed     || 90,
            },
            fuel: {
                enabled:   byType['FUEL_LOW']     ? (byType['FUEL_LOW'].is_active     || false) : false,
                threshold: (fuelCfg.fuelLevel     || {}).minPercent   || 20,
            },
            offline: {
                enabled:   byType['OFFLINE']      ? (byType['OFFLINE'].is_active      || false) : false,
                threshold: (offlineCfg.offline    || {}).delayMinutes || 30,
            },
        });
    } catch (error) {
        logger_1.default.error('[Portal] alert-preferences GET error:', error);
        res.status(500).json({ error: 'Erreur interne' });
    }
}));

// ─────────────────────────────────────────────────────────────────────────────
// PUT /portal/alert-preferences
// Met à jour les préférences d'alertes du CLIENT
// Body: { speed?: { enabled, threshold }, fuel?: { enabled, threshold }, offline?: { enabled, threshold } }
// ─────────────────────────────────────────────────────────────────────────────
router.put('/alert-preferences', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { tenantId } = req.user;
        const { speed, fuel, offline } = req.body;

        const upsertRule = (type, isActive, schedule) => __awaiter(void 0, void 0, void 0, function* () {
            const existing = yield database_1.default.query(
                'SELECT id FROM schedule_rules WHERE tenant_id = $1 AND type = $2',
                [tenantId, type]
            );
            if (existing.rows.length > 0) {
                yield database_1.default.query(
                    'UPDATE schedule_rules SET is_active = $3, schedule = $4, updated_at = NOW() WHERE tenant_id = $1 AND type = $2',
                    [tenantId, type, isActive, JSON.stringify(schedule)]
                );
            } else {
                const id = 'SCH-' + type.slice(0, 3) + '-' + Date.now();
                yield database_1.default.query(
                    "INSERT INTO schedule_rules (id, tenant_id, name, type, schedule, vehicle_ids, group_ids, is_active) VALUES ($1, $2, $3, $4, $5, '{}', '{}', $6)",
                    [id, tenantId, 'Preferences ' + type, type, JSON.stringify(schedule), isActive]
                );
            }
        });

        if (speed !== undefined) {
            const enabled   = speed.enabled !== undefined ? !!speed.enabled : true;
            const threshold = Number(speed.threshold) || 90;
            yield upsertRule('SPEED_LIMIT', enabled, {
                speedLimit: { enabled, maxSpeed: threshold }
            });
        }
        if (fuel !== undefined) {
            const enabled   = fuel.enabled !== undefined ? !!fuel.enabled : false;
            const threshold = Number(fuel.threshold) || 20;
            yield upsertRule('FUEL_LOW', enabled, {
                fuelLevel: { enabled, minPercent: threshold }
            });
        }
        if (offline !== undefined) {
            const enabled   = offline.enabled !== undefined ? !!offline.enabled : false;
            const threshold = Number(offline.threshold) || 30;
            yield upsertRule('OFFLINE', enabled, {
                offline: { enabled, delayMinutes: threshold }
            });
        }

        // Relire et retourner l'état mis à jour
        const result = yield database_1.default.query(
            "SELECT type, schedule, is_active FROM schedule_rules WHERE tenant_id = $1 AND type IN ('SPEED_LIMIT', 'FUEL_LOW', 'OFFLINE')",
            [tenantId]
        );
        const byType = {};
        for (const row of result.rows) {
            byType[row.type] = { schedule: row.schedule || {}, is_active: row.is_active };
        }
        const speedCfg   = (byType['SPEED_LIMIT']  || {}).schedule  || {};
        const fuelCfg    = (byType['FUEL_LOW']      || {}).schedule  || {};
        const offlineCfg = (byType['OFFLINE']       || {}).schedule  || {};
        res.json({
            speed: {
                enabled:   byType['SPEED_LIMIT']  ? (byType['SPEED_LIMIT'].is_active  || false) : false,
                threshold: (speedCfg.speedLimit   || {}).maxSpeed     || 90,
            },
            fuel: {
                enabled:   byType['FUEL_LOW']     ? (byType['FUEL_LOW'].is_active     || false) : false,
                threshold: (fuelCfg.fuelLevel     || {}).minPercent   || 20,
            },
            offline: {
                enabled:   byType['OFFLINE']      ? (byType['OFFLINE'].is_active      || false) : false,
                threshold: (offlineCfg.offline    || {}).delayMinutes || 30,
            },
        });
    } catch (error) {
        logger_1.default.error('[Portal] alert-preferences PUT error:', error);
        res.status(500).json({ error: 'Erreur interne' });
    }
}));

"""

ANCHOR = "exports.default = router;"

def ssh(cmd):
    r = subprocess.run(["ssh", "-o", "ConnectTimeout=10", REMOTE, cmd],
                       capture_output=True, text=True)
    return r.stdout, r.stderr, r.returncode

def main():
    # 1. Lire le fichier actuel
    out, err, rc = ssh(f"cat {FILE}")
    if rc != 0:
        print(f"❌ Impossible de lire {FILE}: {err}"); sys.exit(1)
    content = out

    # 2. Vérifier que le patch n'est pas déjà appliqué
    if "/portal/alert-preferences" in content:
        print("Patch deja applique — rien a faire.")
        return

    # 3. Vérifier que l'ancre existe
    if ANCHOR not in content:
        print(f"❌ Ancre non trouvée : '{ANCHOR}'"); sys.exit(1)

    # 4. Injecter avant exports.default
    new_content = content.replace(ANCHOR, NEW_ROUTES + ANCHOR)

    # 5. Écrire via heredoc SSH
    import shlex
    escaped = new_content.replace("'", "'\\''")
    write_cmd = f"cat > {FILE} << 'PATCHEOF'\n{new_content}\nPATCHEOF"

    # Méthode plus fiable : passer par un fichier temp
    tmp = "/tmp/portalRoutes_patched.js"
    # Envoyer le contenu via stdin
    proc = subprocess.run(
        ["ssh", "-o", "ConnectTimeout=10", REMOTE, f"cat > {tmp}"],
        input=new_content.encode(), capture_output=True
    )
    if proc.returncode != 0:
        print(f"❌ Erreur écriture tmp: {proc.stderr.decode()}"); sys.exit(1)

    # Copier vers destination
    _, err, rc = ssh(f"cp {tmp} {FILE} && rm {tmp}")
    if rc != 0:
        print(f"❌ Erreur copie: {err}"); sys.exit(1)

    # 6. Vérifier que le patch est bien appliqué
    out2, _, _ = ssh(f"grep -c 'alert-preferences' {FILE}")
    count = int(out2.strip()) if out2.strip().isdigit() else 0
    if count < 2:
        print(f"❌ Vérification échouée (trouvé {count} occurrences)"); sys.exit(1)

    # 7. Redémarrer le container
    print("Redemarrage du container backend...")
    _, err, rc = ssh(f"docker restart {CONTAINER}")
    if rc != 0:
        print(f"❌ Erreur restart: {err}"); sys.exit(1)

    # 8. Attendre et vérifier
    import time; time.sleep(5)
    out3, _, _ = ssh(f"docker logs {CONTAINER} --tail 5 2>&1")
    print(f"OK - Patch applique — {count} occurrences trouvees")
    print(f"Logs container:\n{out3}")

if __name__ == "__main__":
    main()
