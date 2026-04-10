"""
patch_insertuser_fix.py
Corrige insertUser dans userRepository.js + createUser dans userController.js :

  1. USER_COLS : ajoute sub_role (manquant)
  2. insertUser SQL : ajoute les 6 colonnes manquantes + $35-$40 dans VALUES
     (client_id, branch_id, vehicle_ids, all_vehicles, sub_role, permissions)
  3. insertUser values[] : ajoute permissions ($40) — $35-$39 déjà présents
  4. userController : destructure permissions + passe à insertUser
"""
import sys

# ─── REPOSITORY ──────────────────────────────────────────────────────────────
REPO = "/var/www/trackyu-gps/backend/dist/repositories/userRepository.js"

with open(REPO, "r", encoding="utf-8") as f:
    repo = f.read()

# 1. USER_COLS : ajouter sub_role
OLD_COLS = "  client_id, branch_id, vehicle_ids, all_vehicles`;"
NEW_COLS = "  client_id, branch_id, vehicle_ids, all_vehicles, sub_role`;"
if OLD_COLS not in repo:
    print("ERREUR fix1 : fin USER_COLS introuvable"); sys.exit(1)
repo = repo.replace(OLD_COLS, NEW_COLS, 1)
print("OK fix1 : sub_role ajouté à USER_COLS")

# 2. insertUser SQL INSERT : ajouter les 6 colonnes + $35-$40
OLD_INSERT_SQL = """\
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
NEW_INSERT_SQL = """\
      INSERT INTO users (
        id, email, password_hash, plain_password, name, role, tenant_id, avatar, phone,
        matricule, cin, date_naissance, lieu_naissance, nationalite, sexe,
        situation_familiale, adresse, ville, code_postal, pays,
        date_embauche, type_contrat, departement, poste, manager_id, salaire,
        contact_urgence_nom, contact_urgence_tel, contact_urgence_lien,
        specialite, niveau, zone, societe, signature,
        client_id, branch_id, vehicle_ids, all_vehicles, sub_role, permissions
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26,
        $27, $28, $29,
        $30, $31, $32, $33, $34,
        $35, $36, $37, $38, $39, $40
      )
      RETURNING ${USER_COLS}"""
if OLD_INSERT_SQL not in repo:
    print("ERREUR fix2 : bloc INSERT introuvable"); sys.exit(1)
repo = repo.replace(OLD_INSERT_SQL, NEW_INSERT_SQL, 1)
print("OK fix2 : client_id/branch_id/vehicle_ids/all_vehicles/sub_role/permissions dans INSERT SQL")

# 3. insertUser values[] : ajouter permissions ($40) après subRole ($39)
OLD_VALUES_END = """\
                (_8 = data.subRole) !== null && _8 !== void 0 ? _8 : null
            ];"""
NEW_VALUES_END = """\
                (_8 = data.subRole) !== null && _8 !== void 0 ? _8 : null,
                JSON.stringify(data.permissions !== null && data.permissions !== void 0 ? data.permissions : [])
            ];"""
if OLD_VALUES_END not in repo:
    print("ERREUR fix3 : fin values[] introuvable"); sys.exit(1)
repo = repo.replace(OLD_VALUES_END, NEW_VALUES_END, 1)
print("OK fix3 : permissions ($40) ajouté dans values[]")

with open(REPO, "w", encoding="utf-8") as f:
    f.write(repo)
print("userRepository.js OK")

# ─── CONTROLLER ──────────────────────────────────────────────────────────────
CTRL = "/var/www/trackyu-gps/backend/dist/controllers/userController.js"

with open(CTRL, "r", encoding="utf-8") as f:
    ctrl = f.read()

# 4. createUser : ajouter permissions dans la destructuration
OLD_DESTR = "subRole, clientId, branchId, vehicleIds, allVehicles } = req.body;"
NEW_DESTR = "subRole, clientId, branchId, vehicleIds, allVehicles, permissions } = req.body;"
if OLD_DESTR not in ctrl:
    print("ERREUR fix4 : fin destructuration introuvable"); sys.exit(1)
ctrl = ctrl.replace(OLD_DESTR, NEW_DESTR, 1)
print("OK fix4 : permissions ajouté dans destructuration")

# 5. createUser : passer permissions à insertUser
OLD_CALL_END = "            vehicleIds: vehicleIds || [], allVehicles: !!allVehicles\n        });"
NEW_CALL_END = """\
            vehicleIds: vehicleIds || [], allVehicles: !!allVehicles,
            permissions: permissions || []
        });"""
if OLD_CALL_END not in ctrl:
    print("ERREUR fix5 : fin appel insertUser introuvable"); sys.exit(1)
ctrl = ctrl.replace(OLD_CALL_END, NEW_CALL_END, 1)
print("OK fix5 : permissions passé à insertUser")

with open(CTRL, "w", encoding="utf-8") as f:
    f.write(ctrl)
print("userController.js OK")

print("\nTous les patches appliqués.")
