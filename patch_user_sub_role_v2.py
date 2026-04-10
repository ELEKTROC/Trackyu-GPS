"""
patch_user_sub_role_v2.py
Applique les fixes 3 à 7 (fix1 et fix2 déjà OK).
"""

import sys

# ─── REPO ────────────────────────────────────────────────────────────────────
REPO = "/var/www/trackyu-gps/backend/dist/repositories/userRepository.js"

with open(REPO, "r", encoding="utf-8") as f:
    repo = f.read()

# fix3a. Ajouter _4,_5,_6,_7,_8 dans la déclaration de variables
OLD_VAR = "            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3;"
NEW_VAR = "            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8;"

if OLD_VAR not in repo:
    print("ERREUR fix3a : déclaration var introuvable"); sys.exit(1)
repo = repo.replace(OLD_VAR, NEW_VAR, 1)
print("OK fix3a : _4.._8 ajoutés dans déclaration var")

# fix3b. Remplacer la dernière ligne de valeurs (signature, sans virgule finale)
OLD_SIG = "                (_3 = data.signature) !== null && _3 !== void 0 ? _3 : null\n            ];"
NEW_SIG = """\
                (_3 = data.signature) !== null && _3 !== void 0 ? _3 : null,
                (_4 = data.clientId) !== null && _4 !== void 0 ? _4 : null,
                (_5 = data.branchId) !== null && _5 !== void 0 ? _5 : null,
                JSON.stringify((_6 = data.vehicleIds) !== null && _6 !== void 0 ? _6 : []),
                (_7 = data.allVehicles) !== null && _7 !== void 0 ? _7 : false,
                (_8 = data.subRole) !== null && _8 !== void 0 ? _8 : null
            ];"""

if OLD_SIG not in repo:
    print("ERREUR fix3b : bloc signature+] introuvable"); sys.exit(1)
repo = repo.replace(OLD_SIG, NEW_SIG, 1)
print("OK fix3b : clientId/branchId/vehicleIds/allVehicles/subRole ajoutés dans values")

# fix4. UPDATE SET : ajouter sub_role = $9, WHERE id = $10
OLD_UPDATE_SET = """\
          name = $1, phone = $2, status = $3,
          branch_id = $4, client_id = $5,
          vehicle_ids = $6, all_vehicles = $7, permissions = $8,
          updated_at = NOW()
        WHERE id = $9"""
NEW_UPDATE_SET = """\
          name = $1, phone = $2, status = $3,
          branch_id = $4, client_id = $5,
          vehicle_ids = $6, all_vehicles = $7, permissions = $8,
          sub_role = $9,
          updated_at = NOW()
        WHERE id = $10"""

if OLD_UPDATE_SET not in repo:
    print("ERREUR fix4 : UPDATE SET introuvable"); sys.exit(1)
repo = repo.replace(OLD_UPDATE_SET, NEW_UPDATE_SET, 1)
print("OK fix4 : sub_role dans UPDATE SET")

# fix4b. UPDATE values : ajouter subRole avant userId
OLD_UPDATE_VALS = "                    JSON.stringify(data.vehicleIds), data.allVehicles,\n                    JSON.stringify(data.permissions), userId"
NEW_UPDATE_VALS = """\
                    JSON.stringify(data.vehicleIds), data.allVehicles,
                    JSON.stringify(data.permissions),
                    (_a2 = data.subRole) !== null && _a2 !== void 0 ? _a2 : null,
                    userId"""

if OLD_UPDATE_VALS not in repo:
    print("ERREUR fix4b : valeurs UPDATE introuvables"); sys.exit(1)
# Declare _a2 in the upsertSubUser var declaration
OLD_UPSERT_VAR = "            var _a, _b, _c, _d, _e;"
NEW_UPSERT_VAR = "            var _a, _b, _c, _d, _e, _a2;"
if OLD_UPSERT_VAR not in repo:
    print("ERREUR fix4b-var : déclaration var upsertSubUser introuvable"); sys.exit(1)
repo = repo.replace(OLD_UPSERT_VAR, NEW_UPSERT_VAR, 1)
repo = repo.replace(OLD_UPDATE_VALS, NEW_UPDATE_VALS, 1)
print("OK fix4b : valeur sub_role ajoutée dans UPDATE")

# fix5. INSERT SOUS_COMPTE SQL : ajouter sub_role colonne + $12
OLD_UPSERT_INSERT = """\
      INSERT INTO users
        (id, email, password_hash, name, role, tenant_id, status,
         branch_id, client_id, vehicle_ids, all_vehicles, permissions)
      VALUES ($1, $2, $3, $4, 'SOUS_COMPTE', $5, $6, $7, $8, $9, $10, $11)"""
NEW_UPSERT_INSERT = """\
      INSERT INTO users
        (id, email, password_hash, name, role, tenant_id, status,
         branch_id, client_id, vehicle_ids, all_vehicles, permissions, sub_role)
      VALUES ($1, $2, $3, $4, 'SOUS_COMPTE', $5, $6, $7, $8, $9, $10, $11, $12)"""

if OLD_UPSERT_INSERT not in repo:
    print("ERREUR fix5 : INSERT SOUS_COMPTE introuvable"); sys.exit(1)
repo = repo.replace(OLD_UPSERT_INSERT, NEW_UPSERT_INSERT, 1)
print("OK fix5 : sub_role dans INSERT SOUS_COMPTE")

# fix5b. INSERT SOUS_COMPTE values : ajouter subRole
OLD_UPSERT_VALS = """\
                data.id, data.email, data.passwordHash, data.name,
                data.tenantId, data.status,
                (_d = data.branchId) !== null && _d !== void 0 ? _d : null,
                (_e = data.clientId) !== null && _e !== void 0 ? _e : null,
                JSON.stringify(data.vehicleIds), data.allVehicles,
                JSON.stringify(data.permissions)"""
NEW_UPSERT_VALS = """\
                data.id, data.email, data.passwordHash, data.name,
                data.tenantId, data.status,
                (_d = data.branchId) !== null && _d !== void 0 ? _d : null,
                (_e = data.clientId) !== null && _e !== void 0 ? _e : null,
                JSON.stringify(data.vehicleIds), data.allVehicles,
                JSON.stringify(data.permissions),
                (_f2 = data.subRole) !== null && _f2 !== void 0 ? _f2 : null"""

if OLD_UPSERT_VALS not in repo:
    print("ERREUR fix5b : valeurs INSERT SOUS_COMPTE introuvables"); sys.exit(1)
# Declare _f2 in the upsertSubUser var declaration (already updated to include _a2)
repo = repo.replace("            var _a, _b, _c, _d, _e, _a2;", "            var _a, _b, _c, _d, _e, _a2, _f2;", 1)
repo = repo.replace(OLD_UPSERT_VALS, NEW_UPSERT_VALS, 1)
print("OK fix5b : valeur sub_role ($12) ajoutée dans INSERT SOUS_COMPTE")

with open(REPO, "w", encoding="utf-8") as f:
    f.write(repo)
print("userRepository.js OK")

# ─── CONTROLLER ──────────────────────────────────────────────────────────────
CTRL = "/var/www/trackyu-gps/backend/dist/controllers/userController.js"

with open(CTRL, "r", encoding="utf-8") as f:
    ctrl = f.read()

# fix6. Destructuration createUser
OLD_DESTR = "const { email, password, name, role: rawRole, tenantId, avatar, allowedTenants, sendInvite, phone, matricule, cin, dateNaissance, lieuNaissance, nationalite, sexe, situationFamiliale, adresse, ville, codePostal, pays, dateEmbauche, typeContrat, departement, poste, managerId, salaire, contactUrgenceNom, contactUrgenceTel, contactUrgenceLien, specialite, niveau, zone, societe, signature } = req.body;"
NEW_DESTR = "const { email, password, name, role: rawRole, tenantId, avatar, allowedTenants, sendInvite, phone, matricule, cin, dateNaissance, lieuNaissance, nationalite, sexe, situationFamiliale, adresse, ville, codePostal, pays, dateEmbauche, typeContrat, departement, poste, managerId, salaire, contactUrgenceNom, contactUrgenceTel, contactUrgenceLien, specialite, niveau, zone, societe, signature, subRole, clientId, branchId, vehicleIds, allVehicles } = req.body;"

if OLD_DESTR not in ctrl:
    print("ERREUR fix6 : destructuration introuvable"); sys.exit(1)
ctrl = ctrl.replace(OLD_DESTR, NEW_DESTR, 1)
print("OK fix6 : subRole/clientId/branchId/vehicleIds/allVehicles dans destructuration")

# fix7. Appel insertUser : ajouter les nouveaux champs
OLD_CALL = "            name, role: role || 'CLIENT', tenantId, avatar, phone,\n            matricule, cin, dateNaissance, lieuNaissance, nationalite, sexe,\n            situationFamiliale, adresse, ville, codePostal, pays,\n            dateEmbauche, typeContrat, departement, poste, managerId, salaire,\n            contactUrgenceNom, contactUrgenceTel, contactUrgenceLien,\n            specialite, niveau, zone, societe, signature"
NEW_CALL = "            name, role: role || 'CLIENT', tenantId, avatar, phone,\n            matricule, cin, dateNaissance, lieuNaissance, nationalite, sexe,\n            situationFamiliale, adresse, ville, codePostal, pays,\n            dateEmbauche, typeContrat, departement, poste, managerId, salaire,\n            contactUrgenceNom, contactUrgenceTel, contactUrgenceLien,\n            specialite, niveau, zone, societe, signature,\n            subRole, clientId, branchId,\n            vehicleIds: vehicleIds || [], allVehicles: !!allVehicles"

if OLD_CALL not in ctrl:
    print("ERREUR fix7 : bloc insertUser call introuvable"); sys.exit(1)
ctrl = ctrl.replace(OLD_CALL, NEW_CALL, 1)
print("OK fix7 : subRole/clientId/branchId/vehicleIds/allVehicles passés à insertUser")

with open(CTRL, "w", encoding="utf-8") as f:
    f.write(ctrl)
print("userController.js OK")

print("\nTous les patches appliqués.")
