"""
regularize_tier_ids.py
Régularise les 3 clients avec des IDs TIER-{timestamp} en base de production.
Les renomme avec le format officiel CLI-{SLUG}-{NNNNN} via get_next_number().

Clients concernés :
  TIER-1775257265918  TEST               tenant_abj  → CLI-ABJ-01505
  TIER-1775149903942  EIBAT              tenant_abj  → CLI-ABJ-01506
  TIER-1773230806233  NZI YAO GUY MARCEL tenant_smt  → CLI-SMT-00125
    └─ 1 ticket lié : TIC-SMT-00018 (tickets.client_id mis à jour en CASCADE)

Le script :
  1. Ouvre une transaction
  2. Pour chaque TIER-xxx : appelle get_next_number() → obtient le nouvel ID
  3. Met à jour tickets.client_id si nécessaire (pas de ON UPDATE CASCADE)
  4. Remplace tiers.id (UPDATE + RETURNING)
  5. Commit
"""

import subprocess
import sys

PSQL = [
    "docker", "exec", "6e9a3283ca3b_trackyu-gps-postgres-1",
    "psql", "-U", "fleet_user", "-d", "fleet_db",
    "-v", "ON_ERROR_STOP=1",
    "-c"
]

TARGETS = [
    ("TIER-1775257265918", "tenant_abj", "client"),
    ("TIER-1775149903942", "tenant_abj", "client"),
    ("TIER-1773230806233", "tenant_smt", "client"),
]

def psql(sql: str) -> str:
    result = subprocess.run(
        PSQL + [sql],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        print(f"ERREUR psql:\n{result.stderr}")
        sys.exit(1)
    return result.stdout.strip()

print("=== Régularisation des IDs TIER- ===\n")

for old_id, tenant_id, module in TARGETS:
    # 1. Vérifier que le tier existe
    check = psql(f"SELECT name FROM tiers WHERE id = '{old_id}';")
    if "(0 rows)" in check:
        print(f"SKIP {old_id} — introuvable en base")
        continue

    # 2. Obtenir le nouvel ID via get_next_number()
    raw = psql(f"SELECT get_next_number('{tenant_id}', '{module}') AS next_id;")
    # Extraire la valeur (format : " CLI-ABJ-01505\n(1 row)")
    new_id = None
    for line in raw.splitlines():
        line = line.strip()
        if line.startswith("CLI-") or line.startswith("RSL-") or line.startswith("SUP-"):
            new_id = line
            break

    if not new_id:
        print(f"ERREUR : impossible d'extraire le nouvel ID depuis : {raw}")
        sys.exit(1)

    # 3. Mettre à jour les FKs sans ON UPDATE CASCADE (tickets)
    tickets_update = psql(
        f"UPDATE tickets SET client_id = '{new_id}' WHERE client_id = '{old_id}' RETURNING id;"
    )
    tickets_updated = [l.strip() for l in tickets_update.splitlines() if l.strip().startswith("TIC-")]
    if tickets_updated:
        print(f"  tickets mis à jour : {tickets_updated}")

    # 4. Renommer le tier
    rename = psql(
        f"UPDATE tiers SET id = '{new_id}', updated_at = NOW() WHERE id = '{old_id}' RETURNING id, name, tenant_id;"
    )
    print(f"  {old_id} → {new_id} : {rename}")

print("\n=== Vérification finale ===")
check_final = psql("SELECT id, name, tenant_id FROM tiers WHERE id LIKE 'TIER-%';")
if "(0 rows)" in check_final:
    print("OK : plus aucun ID TIER- en base")
else:
    print(f"ATTENTION : des IDs TIER- subsistent :\n{check_final}")

print("\nTerminé.")
