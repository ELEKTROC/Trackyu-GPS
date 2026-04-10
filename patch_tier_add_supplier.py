"""
patch_tier_add_supplier.py
Ajoute SUPPLIER → 'supplier' dans le moduleMap de tierController.js
Le counter SUP existe déjà pour tenant_smt (5) et sera auto-créé pour tenant_abj.
"""

FILE = "/var/www/trackyu-gps/backend/dist/controllers/tierController.js"

OLD = "            const _moduleMap = { CLIENT: 'client', RESELLER: 'reseller' };"
NEW = "            const _moduleMap = { CLIENT: 'client', RESELLER: 'reseller', SUPPLIER: 'supplier' };"

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

if OLD not in content:
    print("ERREUR : ligne cible introuvable")
    exit(1)

content = content.replace(OLD, NEW, 1)

with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)

print("OK : SUPPLIER → 'supplier' (prefix SUP) ajouté au moduleMap")
