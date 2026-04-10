# -*- coding: utf-8 -*-
"""
patch_client_bugs_v2.py
Fix CLIENT bugs with correct patterns from actual compiled backend

1. ticketRepository.js  — resolveClientTierId : ajouter lookup users.client_id
2. userRoutes.js        — PUT /:id : permettre self-update sans MANAGE_USERS
"""
import subprocess, sys

def exec_remote(cmd):
    r = subprocess.run(["ssh", "trackyu-vps", cmd], capture_output=True, text=True, encoding='utf-8', errors='replace')
    return r.stdout, r.stderr, r.returncode

def read_file(path):
    out, err, rc = exec_remote(f"docker exec trackyu-gps-backend-1 cat {path}")
    if rc != 0:
        print(f"ERR read {path}: {err}"); sys.exit(1)
    return out

def write_file(path, content):
    cmd = f"docker exec -i trackyu-gps-backend-1 sh -c 'cat > {path}'"
    r = subprocess.run(["ssh", "trackyu-vps", cmd], input=content, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if r.returncode != 0:
        print(f"ERR write {path}: {r.stderr}"); sys.exit(1)
    print(f"  WRITTEN {path}")

def patch(content, old, new, label):
    if old not in content:
        print(f"  SKIP (not found): {label}")
        return content
    result = content.replace(old, new, 1)
    print(f"  OK: {label}")
    return result

BASE = "/app/dist"

# ═══════════════════════════════════════════════════════════════════
# 1. ticketRepository.js — resolveClientTierId
#    Ajouter lookup users.client_id avant le return null final
#    Cas : tier sans email (créé manuellement), user.client_id = 'CLI-XXX-YYYYY'
# ═══════════════════════════════════════════════════════════════════
print("\n[1/2] ticketRepository.js — resolveClientTierId : ajouter users.client_id lookup")
repo_path = f"{BASE}/repositories/ticketRepository.js"
content = read_file(repo_path)

content = patch(content,
    """        const fallback = yield database_1.default.query('SELECT id FROM tickets WHERE client_id = $1 AND tenant_id = $2 LIMIT 1', [userId, tenantId]);
        if (fallback.rows.length > 0)
            return userId;
        return null;""",
    """        const fallback = yield database_1.default.query('SELECT id FROM tickets WHERE client_id = $1 AND tenant_id = $2 LIMIT 1', [userId, tenantId]);
        if (fallback.rows.length > 0)
            return userId;
        // Lookup via users.client_id (tier sans email créé manuellement)
        const userRes = yield database_1.default.query('SELECT client_id FROM users WHERE id = $1 AND client_id IS NOT NULL LIMIT 1', [userId]);
        if (userRes.rows.length > 0 && userRes.rows[0].client_id)
            return userRes.rows[0].client_id;
        return null;""",
    "resolveClientTierId: add users.client_id lookup"
)

write_file(repo_path, content)

# ═══════════════════════════════════════════════════════════════════
# 2. userRoutes.js — PUT /:id
#    Remplacer requirePermission('MANAGE_USERS') par middleware custom
#    qui autorise si req.user.id === req.params.id (self-update)
# ═══════════════════════════════════════════════════════════════════
print("\n[2/2] userRoutes.js — PUT /:id : autoriser self-update CLIENT")
routes_path = f"{BASE}/routes/userRoutes.js"
content = read_file(routes_path)

content = patch(content,
    "router.put('/:id', (0, authMiddleware_1.requirePermission)('MANAGE_USERS'), (0, validateRequest_1.validateRequest)(schemas_1.UserUpdateSchema), userController_1.updateUser);",
    """router.put('/:id', (req, res, next) => {
    // Allow self-update without MANAGE_USERS permission
    if (req.user && req.user.id === req.params.id) return next();
    return (0, authMiddleware_1.requirePermission)('MANAGE_USERS')(req, res, next);
}, (0, validateRequest_1.validateRequest)(schemas_1.UserUpdateSchema), userController_1.updateUser);""",
    "userRoutes PUT /:id: allow self-update"
)

write_file(routes_path, content)

# ═══════════════════════════════════════════════════════════════════
# RESTART
# ═══════════════════════════════════════════════════════════════════
print("\n[RESTART] Redémarrage du backend...")
r = subprocess.run(["ssh", "trackyu-vps", "docker restart trackyu-gps-backend-1"],
                   capture_output=True, text=True, encoding='utf-8', errors='replace')
print(r.stdout.strip() or r.stderr.strip())
print("\nDone.")
