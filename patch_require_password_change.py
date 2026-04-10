"""
patch_require_password_change.py
Force le changement de mot de passe à la première connexion pour :
  - Chemin A : sendInvite = true (mot de passe random)
  - Chemin B : SOUS_COMPTE sans password explicite (Trackyu2025! par défaut)
  - Chemin C : createUserAccount dans tierController (Trackyu2025! par défaut)

Patches :
  1. userRepository.js   : USER_COLS ajoute require_password_change
  2. userController.js   : UPDATE require_password_change = true si sendInvite || !password
  3. tierController.js   : require_password_change = true dans INSERT users
  4. authController.js   : requirePasswordChange dans réponse login
"""
import sys

# ─── 1. USER_COLS ─────────────────────────────────────────────────────────────
REPO = "/var/www/trackyu-gps/backend/dist/repositories/userRepository.js"
with open(REPO, "r", encoding="utf-8") as f:
    repo = f.read()

OLD_COLS = "  id, email, name, role, tenant_id, avatar, phone, status, permissions,\n  created_at, updated_at, last_login, require_2fa, plain_password,"
NEW_COLS = "  id, email, name, role, tenant_id, avatar, phone, status, permissions,\n  created_at, updated_at, last_login, require_2fa, require_password_change, plain_password,"

if OLD_COLS not in repo:
    print("ERREUR fix1 : USER_COLS introuvable"); sys.exit(1)
repo = repo.replace(OLD_COLS, NEW_COLS, 1)
with open(REPO, "w", encoding="utf-8") as f:
    f.write(repo)
print("OK fix1 : require_password_change ajouté dans USER_COLS")

# ─── 2. userController : set flag après insertUser ────────────────────────────
CTRL = "/var/www/trackyu-gps/backend/dist/controllers/userController.js"
with open(CTRL, "r", encoding="utf-8") as f:
    ctrl = f.read()

# Après la ligne "const createdUser = yield userRepository..." trouver le bloc
# allowedTenants et insérer le UPDATE juste avant
OLD_AFTER_INSERT = """\
        if (allowedTenants === null || allowedTenants === void 0 ? void 0 : allowedTenants.length) {
            yield userRepository_1.userRepository.grantTenantAccess(id, allowedTenants, ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || 'SYSTEM');
        }"""

NEW_AFTER_INSERT = """\
        // Force password change si mot de passe non fourni par l'admin (sendInvite ou SOUS_COMPTE sans password)
        const mustChangePassword = !!sendInvite || !password;
        if (mustChangePassword) {
            yield database_1.default.query('UPDATE users SET require_password_change = true WHERE id = $1', [id]);
        }
        if (allowedTenants === null || allowedTenants === void 0 ? void 0 : allowedTenants.length) {
            yield userRepository_1.userRepository.grantTenantAccess(id, allowedTenants, ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || 'SYSTEM');
        }"""

if OLD_AFTER_INSERT not in ctrl:
    print("ERREUR fix2 : bloc allowedTenants introuvable dans createUser"); sys.exit(1)

# Vérifier que database_1 est importé dans userController
if "database_1" not in ctrl:
    # Ajouter l'import après le dernier require
    OLD_IMPORT = "const AuditService_1 = require(\"../services/AuditService\");"
    NEW_IMPORT = "const AuditService_1 = require(\"../services/AuditService\");\nconst database_1 = require(\"../config/database\");"
    if OLD_IMPORT in ctrl:
        ctrl = ctrl.replace(OLD_IMPORT, NEW_IMPORT, 1)
        print("OK fix2-import : database_1 ajouté dans userController")
    else:
        # Chercher un autre import connu
        OLD_IMPORT2 = "const userRepository_1 = require(\"../repositories/userRepository\");"
        NEW_IMPORT2 = "const userRepository_1 = require(\"../repositories/userRepository\");\nconst database_1 = require(\"../config/database\");"
        if OLD_IMPORT2 not in ctrl:
            print("ERREUR fix2-import : aucun import connu trouvé"); sys.exit(1)
        ctrl = ctrl.replace(OLD_IMPORT2, NEW_IMPORT2, 1)
        print("OK fix2-import : database_1 ajouté dans userController")

ctrl = ctrl.replace(OLD_AFTER_INSERT, NEW_AFTER_INSERT, 1)
with open(CTRL, "w", encoding="utf-8") as f:
    f.write(ctrl)
print("OK fix2 : require_password_change mis à true si sendInvite || !password")

# ─── 3. tierController : require_password_change dans INSERT ──────────────────
TIER = "/var/www/trackyu-gps/backend/dist/controllers/tierController.js"
with open(TIER, "r", encoding="utf-8") as f:
    tier = f.read()

OLD_TIER_INSERT = (
    "\"INSERT INTO users (id, email, password_hash, name, role, tenant_id, status, permissions, client_id)"
    " VALUES ($1, $2, $3, $4, 'CLIENT', $5, 'Actif', $6, $7)\",\n"
    "                        [_userId, _loginEmail, _pwHash, name, effectiveTenantId, JSON.stringify(_clientPerms), newId]"
)
NEW_TIER_INSERT = (
    "\"INSERT INTO users (id, email, password_hash, name, role, tenant_id, status, permissions, client_id, require_password_change)"
    " VALUES ($1, $2, $3, $4, 'CLIENT', $5, 'Actif', $6, $7, true)\",\n"
    "                        [_userId, _loginEmail, _pwHash, name, effectiveTenantId, JSON.stringify(_clientPerms), newId]"
)

if OLD_TIER_INSERT not in tier:
    print("ERREUR fix3 : INSERT users dans tierController introuvable"); sys.exit(1)
tier = tier.replace(OLD_TIER_INSERT, NEW_TIER_INSERT, 1)
with open(TIER, "w", encoding="utf-8") as f:
    f.write(tier)
print("OK fix3 : require_password_change = true dans INSERT tierController")

# ─── 4. authController : requirePasswordChange dans réponse login ─────────────
AUTH = "/var/www/trackyu-gps/backend/dist/controllers/authController.js"
with open(AUTH, "r", encoding="utf-8") as f:
    auth = f.read()

OLD_LOGIN_RESP = "res.json({ token, user: Object.assign(Object.assign({}, userInfo), { last_login: new Date().toISOString() }) });"
NEW_LOGIN_RESP = """\
const loginPayload = Object.assign(Object.assign({}, userInfo), { last_login: new Date().toISOString() });
        if (user.require_password_change) {
            loginPayload.requirePasswordChange = true;
        }
        res.json({ token, user: loginPayload });"""

if OLD_LOGIN_RESP not in auth:
    print("ERREUR fix4 : res.json login introuvable"); sys.exit(1)
auth = auth.replace(OLD_LOGIN_RESP, NEW_LOGIN_RESP, 1)
with open(AUTH, "w", encoding="utf-8") as f:
    f.write(auth)
print("OK fix4 : requirePasswordChange ajouté dans réponse login")

print("\nTous les patches appliqués.")
