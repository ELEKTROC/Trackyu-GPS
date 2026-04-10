"""
patch_user_sub_role.py
Ajoute sub_role + clientId + branchId + vehicleIds + allVehicles
dans le flux de création/mise à jour des utilisateurs.

Fichiers patchés (dist/) :
  1. repositories/userRepository.js
     - USER_COLS : ajoute sub_role
     - insertUser : ajoute sub_role, client_id, branch_id, vehicle_ids, all_vehicles
     - updateUser (upsert sous-comptes) : ajoute sub_role
  2. controllers/userController.js
     - createUser : destructure + passe subRole, clientId, branchId, vehicleIds, allVehicles
"""

import sys

# ─── REPO ────────────────────────────────────────────────────────────────────
REPO = "/var/www/trackyu-gps/backend/dist/repositories/userRepository.js"

with open(REPO, "r", encoding="utf-8") as f:
    repo = f.read()

# 1. USER_COLS : ajouter sub_role
OLD_COLS = "  client_id, branch_id, vehicle_ids, all_vehicles`;"
NEW_COLS = "  client_id, branch_id, vehicle_ids, all_vehicles, sub_role`;"
if OLD_COLS not in repo:
    print("ERREUR repo fix1 : USER_COLS introuvable"); sys.exit(1)
repo = repo.replace(OLD_COLS, NEW_COLS, 1)
print("OK repo fix1 : sub_role ajouté à USER_COLS")

# 2. insertUser : ajouter les colonnes sub_role, client_id, branch_id, vehicle_ids, all_vehicles
OLD_INSERT_COLS = """\
      INSERT INTO users (
        id, email, password_hash, plain_password, name, role, tenant_id, avatar, phone,
        matricule, cin, date_naissance, lieu_naissance, nationalite, sexe,
        situation_familiale, adresse, ville, code_postal, pays,
        date_embauche, type_contrat, departement, poste, manager_id, salaire,
        contact_urgence_nom, contact_urgence_tel, contact_urgence_lien,
        specialite, niveau, zone, societe, signature
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26,
        $27, $28, $29,
        $30, $31, $32, $33, $34
      )
      RETURNING ${USER_COLS}"""

NEW_INSERT_COLS = """\
      INSERT INTO users (
        id, email, password_hash, plain_password, name, role, tenant_id, avatar, phone,
        matricule, cin, date_naissance, lieu_naissance, nationalite, sexe,
        situation_familiale, adresse, ville, code_postal, pays,
        date_embauche, type_contrat, departement, poste, manager_id, salaire,
        contact_urgence_nom, contact_urgence_tel, contact_urgence_lien,
        specialite, niveau, zone, societe, signature,
        client_id, branch_id, vehicle_ids, all_vehicles, sub_role
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26,
        $27, $28, $29,
        $30, $31, $32, $33, $34,
        $35, $36, $37, $38, $39
      )
      RETURNING ${USER_COLS}"""

if OLD_INSERT_COLS not in repo:
    print("ERREUR repo fix2 : bloc INSERT introuvable"); sys.exit(1)
repo = repo.replace(OLD_INSERT_COLS, NEW_INSERT_COLS, 1)
print("OK repo fix2 : client_id/branch_id/vehicle_ids/all_vehicles/sub_role dans INSERT")

# 3. insertUser values : ajouter les 5 nouvelles valeurs après signature
OLD_VALUES_END = """\
                (_r = data.typeContrat) !== null && _r !== void 0 ? _r : null,"""

# On trouve la fin du bloc values (signature est le dernier)
OLD_SIGNATURE_LINE = "                (_3 = data.signature) !== null && _3 !== void 0 ? _3 : null,"
NEW_SIGNATURE_LINE = """\
                (_3 = data.signature) !== null && _3 !== void 0 ? _3 : null,
                (_4 = data.clientId) !== null && _4 !== void 0 ? _4 : null,
                (_5 = data.branchId) !== null && _5 !== void 0 ? _5 : null,
                JSON.stringify((_6 = data.vehicleIds) !== null && _6 !== void 0 ? _6 : []),
                (_7 = data.allVehicles) !== null && _7 !== void 0 ? _7 : false,
                (_8 = data.subRole) !== null && _8 !== void 0 ? _8 : null,"""

if OLD_SIGNATURE_LINE not in repo:
    print("ERREUR repo fix3 : ligne signature introuvable dans values"); sys.exit(1)
repo = repo.replace(OLD_SIGNATURE_LINE, NEW_SIGNATURE_LINE, 1)
print("OK repo fix3 : valeurs client_id/branch_id/vehicle_ids/all_vehicles/sub_role ajoutées")

# 4. updateUser (upsert sous-comptes) : ajouter sub_role dans UPDATE SET
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
    print("ERREUR repo fix4 : UPDATE SET introuvable"); sys.exit(1)
repo = repo.replace(OLD_UPDATE_SET, NEW_UPDATE_SET, 1)
print("OK repo fix4 : sub_role dans UPDATE SET")

# 4b. Mettre à jour les valeurs du UPDATE (ajouter data.subRole, changer userId de $9 → $10)
OLD_UPDATE_VALUES = """\
                    JSON.stringify(data.vehicleIds), data.allVehicles,
                    JSON.stringify(data.permissions), userId"""
NEW_UPDATE_VALUES = """\
                    JSON.stringify(data.vehicleIds), data.allVehicles,
                    JSON.stringify(data.permissions),
                    (_a2 = data.subRole) !== null && _a2 !== void 0 ? _a2 : null,
                    userId"""

if OLD_UPDATE_VALUES not in repo:
    print("ERREUR repo fix4b : valeurs UPDATE introuvables"); sys.exit(1)
repo = repo.replace(OLD_UPDATE_VALUES, NEW_UPDATE_VALUES, 1)
print("OK repo fix4b : valeur sub_role ajoutée dans UPDATE")

# 5. updateUser INSERT (SOUS_COMPTE) : ajouter sub_role
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
    print("ERREUR repo fix5 : INSERT SOUS_COMPTE introuvable"); sys.exit(1)
repo = repo.replace(OLD_UPSERT_INSERT, NEW_UPSERT_INSERT, 1)
print("OK repo fix5 : sub_role dans INSERT SOUS_COMPTE")

# 5b. Ajouter la valeur $12 (subRole) dans les paramètres de l'INSERT SOUS_COMPTE
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
    print("ERREUR repo fix5b : valeurs INSERT SOUS_COMPTE introuvables"); sys.exit(1)
repo = repo.replace(OLD_UPSERT_VALS, NEW_UPSERT_VALS, 1)
print("OK repo fix5b : valeur sub_role ($12) ajoutée dans INSERT SOUS_COMPTE")

with open(REPO, "w", encoding="utf-8") as f:
    f.write(repo)

# ─── CONTROLLER ──────────────────────────────────────────────────────────────
CTRL = "/var/www/trackyu-gps/backend/dist/controllers/userController.js"

with open(CTRL, "r", encoding="utf-8") as f:
    ctrl = f.read()

# 6. createUser : ajouter subRole, clientId, branchId, vehicleIds, allVehicles dans la destructuration
OLD_DESTRUCTURE = "const { email, password, name, role: rawRole, tenantId, avatar, allowedTenants, sendInvite, phone, matricule, cin, dateNaissance, lieuNaissance, nationalite, sexe, situationFamiliale, adresse, ville, codePostal, pays, dateEmbauche, typeContrat, departement, poste, managerId, salaire, contactUrgenceNom, contactUrgenceTel, contactUrgenceLien, specialite, niveau, zone, societe, signature } = req.body;"
NEW_DESTRUCTURE = "const { email, password, name, role: rawRole, tenantId, avatar, allowedTenants, sendInvite, phone, matricule, cin, dateNaissance, lieuNaissance, nationalite, sexe, situationFamiliale, adresse, ville, codePostal, pays, dateEmbauche, typeContrat, departement, poste, managerId, salaire, contactUrgenceNom, contactUrgenceTel, contactUrgenceLien, specialite, niveau, zone, societe, signature, subRole, clientId, branchId, vehicleIds, allVehicles } = req.body;"

if OLD_DESTRUCTURE not in ctrl:
    print("ERREUR ctrl fix6 : destructuration introuvable"); sys.exit(1)
ctrl = ctrl.replace(OLD_DESTRUCTURE, NEW_DESTRUCTURE, 1)
print("OK ctrl fix6 : subRole/clientId/branchId/vehicleIds/allVehicles dans destructuration")

# 7. createUser : ajouter les champs dans l'appel à insertUser
OLD_INSERT_CALL = "            name, role: role || 'CLIENT', tenantId, avatar, phone,\n            matricule, cin, dateNaissance, lieuNaissance, nationalite, sexe,\n            situationFamiliale, adresse, ville, codePostal, pays,\n            dateEmbauche, typeContrat, departement, poste, managerId, salaire,\n            contactUrgenceNom, contactUrgenceTel, contactUrgenceLien,\n            specialite, niveau, zone, societe, signature"
NEW_INSERT_CALL = "            name, role: role || 'CLIENT', tenantId, avatar, phone,\n            matricule, cin, dateNaissance, lieuNaissance, nationalite, sexe,\n            situationFamiliale, adresse, ville, codePostal, pays,\n            dateEmbauche, typeContrat, departement, poste, managerId, salaire,\n            contactUrgenceNom, contactUrgenceTel, contactUrgenceLien,\n            specialite, niveau, zone, societe, signature,\n            subRole, clientId, branchId,\n            vehicleIds: vehicleIds || [], allVehicles: !!allVehicles"

if OLD_INSERT_CALL not in ctrl:
    print("ERREUR ctrl fix7 : bloc insertUser call introuvable"); sys.exit(1)
ctrl = ctrl.replace(OLD_INSERT_CALL, NEW_INSERT_CALL, 1)
print("OK ctrl fix7 : subRole/clientId/branchId/vehicleIds/allVehicles passés à insertUser")

with open(CTRL, "w", encoding="utf-8") as f:
    f.write(ctrl)

print("\nTous les patches appliqués.")
