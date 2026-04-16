# -*- coding: utf-8 -*-
#!/usr/bin/env python3
"""
Patch : Cascade statut CRM → users
- Désactivation tier (INACTIVE) → suspend CLIENT/SOUS_COMPTE liés (client_id = tier.id)
- Réactivation tier (ACTIVE)    → réactive les users suspendus liés
"""
import subprocess, tempfile, os

CONTAINER = "trackyu-gps-backend-1"

def read_remote(path):
    r = subprocess.run(
        ["ssh", "root@148.230.126.62", f"docker exec {CONTAINER} cat {path}"],
        capture_output=True, text=True, encoding='utf-8'
    )
    return r.stdout

def write_remote(path, content):
    with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False, encoding='utf-8') as f:
        f.write(content)
        tmp = f.name
    try:
        tmp_remote = f"/tmp/patch_tier_{os.path.basename(tmp)}"
        subprocess.run(["scp", tmp, f"root@148.230.126.62:{tmp_remote}"], check=True, capture_output=True)
        subprocess.run(
            ["ssh", "root@148.230.126.62", f"docker cp {tmp_remote} {CONTAINER}:{path} && rm {tmp_remote}"],
            check=True, capture_output=True
        )
    finally:
        os.unlink(tmp)

print("=== PATCH TIER CASCADE STATUS ===\n")

path = "/app/dist/controllers/tierController.js"
content = read_remote(path)

# On insère la cascade juste avant res.json(updatedTier) dans updateTier
OLD = """        AuditService_1.AuditService.log({
            userId: (_b = req.user) === null || _b === void 0 ? void 0 : _b.id,
            tenantId: updatedTier.tenantId,
            action: 'UPDATE', entityType: 'tier', entityId: id,
            details: { name, email, status, type: updatedTier.type },
        });
        res.json(updatedTier);"""

NEW = """        // ── CASCADE STATUT : tier → users liés ────────────────────────────────
        if (status !== undefined) {
            const newStatus = (status || '').toUpperCase();
            try {
                if (newStatus === 'INACTIVE') {
                    // Suspendre tous les CLIENT/SOUS_COMPTE liés à ce tier
                    yield pool_1.default.query(
                        `UPDATE users SET status = 'Suspendu'
                         WHERE client_id = $1
                           AND role IN ('CLIENT', 'SOUS_COMPTE')
                           AND deleted_at IS NULL
                           AND status != 'Suspendu'`,
                        [id]
                    );
                    logger_1.default.info(`[TierController] Cascade INACTIVE → users suspendus pour tier ${id}`);
                } else if (newStatus === 'ACTIVE') {
                    // Réactiver les users suspendus liés
                    yield pool_1.default.query(
                        `UPDATE users SET status = 'Actif'
                         WHERE client_id = $1
                           AND role IN ('CLIENT', 'SOUS_COMPTE')
                           AND deleted_at IS NULL
                           AND status = 'Suspendu'`,
                        [id]
                    );
                    logger_1.default.info(`[TierController] Cascade ACTIVE → users réactivés pour tier ${id}`);
                }
            } catch (cascadeErr) {
                logger_1.default.error('[TierController] Erreur cascade statut users:', cascadeErr);
                // Non bloquant : le tier est mis à jour même si la cascade échoue
            }
        }
        AuditService_1.AuditService.log({
            userId: (_b = req.user) === null || _b === void 0 ? void 0 : _b.id,
            tenantId: updatedTier.tenantId,
            action: 'UPDATE', entityType: 'tier', entityId: id,
            details: { name, email, status, type: updatedTier.type },
        });
        res.json(updatedTier);"""

if OLD not in content:
    print("ERREUR : cible introuvable dans tierController.js")
    print("Recherche partielle...")
    # Show context around res.json(updatedTier)
    idx = content.find("res.json(updatedTier)")
    if idx > 0:
        print(f"Trouvé 'res.json(updatedTier)' à index {idx}")
        print(content[max(0,idx-200):idx+50])
    exit(1)

content = content.replace(OLD, NEW)
write_remote(path, content)
print("OK tierController.js patché")

r = subprocess.run(
    ["ssh", "root@148.230.126.62", "docker restart trackyu-gps-backend-1"],
    capture_output=True, text=True
)
print("Redémarrage:", r.stdout.strip())
print("=== DONE ===")
