# -*- coding: utf-8 -*-
"""
patch_vehicle_detail_stats.py

Fix 1: objectRepository.findByIdWithJoins — ajouter JOIN LATERAL dernière position
        (lat/lng manquants → carte vide, adresse absente)

Fix 2: objectRepository.getDayStats — offlineSeconds calculé sur 24h fixes
        au lieu du temps écoulé depuis minuit (affiche 24:00 à 04:00)
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
repo_path = f"{BASE}/repositories/objectRepository.js"

print("\n[1/2] objectRepository.js — findByIdWithJoins : ajouter JOIN LATERAL positions")
content = read_file(repo_path)

content = patch(content,
    """      SELECT o.*,
             t.name as client_name,
             g.name as group_name
      FROM objects o
      LEFT JOIN tiers t ON o.client_id = t.id AND t.type = 'CLIENT'
      LEFT JOIN groups g ON o.group_id = g.id
      WHERE o.id = $1
    """,
    """      SELECT o.*,
             t.name as client_name,
             g.name as group_name,
             lp.latitude as location_lat,
             lp.longitude as location_lng,
             lp.time as last_updated,
             COALESCE(o.address, lp.address) as address
      FROM objects o
      LEFT JOIN tiers t ON o.client_id = t.id AND t.type = 'CLIENT'
      LEFT JOIN groups g ON o.group_id = g.id
      LEFT JOIN LATERAL (
        SELECT latitude, longitude, time, address
        FROM positions
        WHERE object_id = o.id
        ORDER BY time DESC
        LIMIT 1
      ) lp ON true
      WHERE o.id = $1
    """,
    "findByIdWithJoins: add JOIN LATERAL last position"
)

# ── Fix 2 : getDayStats offlineSeconds ─────────────────────────────────────────
print("\n[2/2] objectRepository.js — getDayStats : offlineSeconds vs temps écoulé")

content = patch(content,
    "const offlineSeconds  = Math.max(0, 24 * 3600 - totalActive);",
    """// Elapsed seconds since midnight (capped at 24h) — not a fixed 24h
            const elapsedSeconds = Math.min(
                Math.floor((Date.now() - new Date(startOfDay).getTime()) / 1000),
                24 * 3600
            );
            const offlineSeconds  = Math.max(0, elapsedSeconds - totalActive);""",
    "getDayStats: offlineSeconds = elapsed - active (not 24h - active)"
)

write_file(repo_path, content)

print("\n[RESTART] Redémarrage du backend...")
r = subprocess.run(["ssh", "trackyu-vps", "docker restart trackyu-gps-backend-1"],
                   capture_output=True, text=True, encoding='utf-8', errors='replace')
print(r.stdout.strip() or r.stderr.strip())
print("\nDone.")
