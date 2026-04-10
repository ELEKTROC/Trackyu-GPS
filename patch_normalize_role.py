"""
patch_normalize_role.py
Ajoute SOUS_COMPTE, RESELLER, SUPPLIER dans la whitelist de normalizeRole()
"""
import sys

CTRL = "/var/www/trackyu-gps/backend/dist/controllers/userController.js"

with open(CTRL, "r", encoding="utf-8") as f:
    s = f.read()

OLD = "    if (['SUPERADMIN', 'ADMIN', 'MANAGER', 'COMMERCIAL', 'TECH', 'SUPPORT_AGENT', 'AGENT_TRACKING', 'COMPTABLE', 'CLIENT'].includes(upper))"
NEW = "    if (['SUPERADMIN', 'ADMIN', 'MANAGER', 'COMMERCIAL', 'TECH', 'SUPPORT_AGENT', 'AGENT_TRACKING', 'COMPTABLE', 'CLIENT', 'SOUS_COMPTE', 'RESELLER', 'SUPPLIER'].includes(upper))"

if OLD not in s:
    print("ERREUR : whitelist normalizeRole introuvable")
    sys.exit(1)

s = s.replace(OLD, NEW, 1)

with open(CTRL, "w", encoding="utf-8") as f:
    f.write(s)

print("OK : SOUS_COMPTE + RESELLER + SUPPLIER ajoutés à normalizeRole")
