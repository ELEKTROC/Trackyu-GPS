"""
patch_tier_client_id.py
Lie le user créé via createUserAccount à son tier parent (client_id = newId).
"""
import sys

CTRL = "/var/www/trackyu-gps/backend/dist/controllers/tierController.js"

with open(CTRL, "r", encoding="utf-8") as f:
    s = f.read()

OLD = ("\"INSERT INTO users (id, email, password_hash, name, role, tenant_id, status, permissions)"
       " VALUES ($1, $2, $3, $4, 'CLIENT', $5, 'Actif', $6)\",\n"
       "                        [_userId, _loginEmail, _pwHash, name, effectiveTenantId, JSON.stringify(_clientPerms)]")

NEW = ("\"INSERT INTO users (id, email, password_hash, name, role, tenant_id, status, permissions, client_id)"
       " VALUES ($1, $2, $3, $4, 'CLIENT', $5, 'Actif', $6, $7)\",\n"
       "                        [_userId, _loginEmail, _pwHash, name, effectiveTenantId, JSON.stringify(_clientPerms), newId]")

if OLD not in s:
    print("ERREUR : INSERT users dans tierController introuvable")
    sys.exit(1)

s = s.replace(OLD, NEW, 1)

with open(CTRL, "w", encoding="utf-8") as f:
    f.write(s)

print("OK : client_id = newId ajouté dans INSERT users via createUserAccount")
