"""
patch_tier_user_id.py
Normalise l'ID des users créés via POST /api/tiers (createUserAccount).
Avant : 'usr-' + newId + '-' + Date.now()  → ex: usr-CLI-ABJ-01507-1775257265918
Après : 'USR-' + Date.now()                → ex: USR-1775257265918
"""

FILE = "/var/www/trackyu-gps/backend/dist/controllers/tierController.js"

OLD = "                    var _userId = 'usr-' + newId + '-' + Date.now();"
NEW = "                    var _userId = 'USR-' + Date.now();"

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

if OLD not in content:
    print("ERREUR : ligne cible introuvable")
    exit(1)

content = content.replace(OLD, NEW, 1)

with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)

print("OK : ID user via Tier normalisé → USR-{timestamp}")
