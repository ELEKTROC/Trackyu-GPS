"""
migrate_users_sub_role.py
Migration users table :
  1. client_id  : uuid → varchar(50)  (les IDs tier sont CLI-ABJ-xxxxx, pas des UUID)
  2. branch_id  : uuid → varchar(50)  (même raison — branches.id est varchar)
  3. sub_role   : ADD COLUMN varchar(30)  (Manager | User | Viewer pour SOUS_COMPTE)

Sécurité : client_id et branch_id sont vides (0 lignes) → pas de données à migrer.
"""

import subprocess, sys

PSQL = ["docker", "exec", "trackyu-gps-postgres-1",
        "psql", "-U", "fleet_user", "-d", "fleet_db",
        "-v", "ON_ERROR_STOP=1", "-c"]

SQL = """
BEGIN;

-- 1. client_id : uuid → varchar(50)
ALTER TABLE users DROP COLUMN IF EXISTS client_id;
ALTER TABLE users ADD COLUMN client_id varchar(50);
CREATE INDEX IF NOT EXISTS idx_users_client_id ON users(client_id) WHERE deleted_at IS NULL;

-- 2. branch_id : uuid → varchar(50)
ALTER TABLE users DROP COLUMN IF EXISTS branch_id;
ALTER TABLE users ADD COLUMN branch_id varchar(50);
CREATE INDEX IF NOT EXISTS idx_users_branch_id ON users(branch_id) WHERE deleted_at IS NULL;

-- 3. sub_role : nouvelle colonne
ALTER TABLE users ADD COLUMN IF NOT EXISTS sub_role varchar(30);
COMMENT ON COLUMN users.sub_role IS
  'Sous-rôle pour les SOUS_COMPTE : Manager | User | Viewer';

COMMIT;
"""

result = subprocess.run(PSQL + [SQL], capture_output=True, text=True)
if result.returncode != 0:
    print(f"ERREUR:\n{result.stderr}")
    sys.exit(1)
print(result.stdout)

# Vérification
verify = subprocess.run(
    PSQL + ["SELECT column_name, data_type, character_maximum_length "
            "FROM information_schema.columns "
            "WHERE table_name='users' AND column_name IN ('client_id','branch_id','sub_role') "
            "ORDER BY column_name;"],
    capture_output=True, text=True
)
print(verify.stdout)
print("Migration terminée.")
