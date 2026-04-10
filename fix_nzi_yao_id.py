"""
fix_nzi_yao_id.py
Régularise TIER-1773230806233 (NZI YAO GUY MARCEL, tenant_smt)
Le counter a déjà été incrémenté → nouvel ID = CLI-SMT-00125 (figé).

Stratégie pour contourner la FK tickets→tiers sans ON UPDATE CASCADE :
  1. BEGIN
  2. SET client_id = NULL dans tickets (libère l'ancienne FK)
  3. UPDATE tiers.id TIER-xxx → CLI-SMT-00125
  4. RESTORE tickets.client_id = 'CLI-SMT-00125'
  5. COMMIT
"""

import subprocess
import sys

PSQL_BASE = [
    "docker", "exec", "6e9a3283ca3b_trackyu-gps-postgres-1",
    "psql", "-U", "fleet_user", "-d", "fleet_db",
    "-v", "ON_ERROR_STOP=1",
]

OLD_ID = "TIER-1773230806233"
NEW_ID = "CLI-SMT-00125"
TICKET_ID = "TIC-SMT-00018"

SQL = f"""
BEGIN;

-- 1. Libérer la FK tickets→tiers en mettant client_id à NULL temporairement
UPDATE tickets SET client_id = NULL WHERE id = '{TICKET_ID}' AND client_id = '{OLD_ID}';

-- 2. Renommer l'ID du tier
UPDATE tiers SET id = '{NEW_ID}', updated_at = NOW() WHERE id = '{OLD_ID}';

-- 3. Restaurer le client_id dans le ticket avec le nouvel ID
UPDATE tickets SET client_id = '{NEW_ID}' WHERE id = '{TICKET_ID}';

-- 4. Vérification avant commit
SELECT t.id, t.name, tk.id as ticket_id, tk.client_id
FROM tiers t
LEFT JOIN tickets tk ON tk.client_id = t.id
WHERE t.id = '{NEW_ID}';

COMMIT;
"""

result = subprocess.run(
    PSQL_BASE + ["-c", SQL],
    capture_output=True, text=True
)

if result.returncode != 0:
    print(f"ERREUR:\n{result.stderr}")
    sys.exit(1)

print(result.stdout)

# Vérification finale
check = subprocess.run(
    PSQL_BASE + ["-c", "SELECT id, name FROM tiers WHERE id LIKE 'TIER-%';"],
    capture_output=True, text=True
)
output = check.stdout.strip()
if "(0 rows)" in output:
    print("OK : plus aucun ID TIER- en base production")
else:
    print(f"ATTENTION — IDs TIER- restants :\n{output}")
