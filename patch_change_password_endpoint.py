"""
patch_change_password_endpoint.py
Ajoute POST /api/auth/change-password :
  - Authentifié (JWT requis)
  - Vérifie l'ancien mot de passe
  - Hash le nouveau mot de passe
  - Remet require_password_change = false
"""
import sys

AUTH = "/var/www/trackyu-gps/backend/dist/controllers/authController.js"
ROUTES = "/var/www/trackyu-gps/backend/dist/routes/authRoutes.js"

# ─── 1. Ajouter la fonction changePassword dans authController ────────────────
with open(AUTH, "r", encoding="utf-8") as f:
    auth = f.read()

# Insérer avant le dernier exports
OLD_EXPORTS_END = "exports.logout = exports.refresh ="
NEW_CHANGE_PW = """\
const changePassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Non authentifié' });
    const { currentPassword, newPassword } = req.body || {};
    if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ message: 'Le nouveau mot de passe doit contenir au moins 8 caractères' });
    }
    try {
        const result = yield authRepo.findUserByEmail(req.user.email);
        const user = result.rows[0];
        if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });
        // Vérifier l'ancien mot de passe seulement si require_password_change = false
        if (!user.require_password_change) {
            if (!currentPassword) return res.status(400).json({ message: 'Mot de passe actuel requis' });
            const isMatch = yield bcryptjs_1.default.compare(currentPassword, user.password_hash);
            if (!isMatch) return res.status(401).json({ message: 'Mot de passe actuel incorrect' });
        }
        const salt = yield bcryptjs_1.default.genSalt(10);
        const hash = yield bcryptjs_1.default.hash(newPassword, salt);
        yield authRepo.pool.query(
            'UPDATE users SET password_hash = $1, plain_password = $2, require_password_change = false, updated_at = NOW() WHERE id = $3',
            [hash, newPassword, userId]
        );
        AuditService_1.AuditService.log({
            userId, action: 'PASSWORD_CHANGED', entityType: 'USER', entityId: userId,
            details: { forced: !!user.require_password_change },
            ipAddress: req.ip, userAgent: req.get('User-Agent')
        });
        res.json({ message: 'Mot de passe modifié avec succès' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors du changement de mot de passe', error: String(error) });
    }
});
exports.changePassword = changePassword;
exports.logout = exports.refresh ="""

if OLD_EXPORTS_END not in auth:
    print("ERREUR : exports.logout introuvable dans authController"); sys.exit(1)

auth = auth.replace(OLD_EXPORTS_END, NEW_CHANGE_PW, 1)
with open(AUTH, "w", encoding="utf-8") as f:
    f.write(auth)
print("OK fix1 : changePassword ajouté dans authController.js")

# ─── 2. Vérifier que authRepo a accès à pool ─────────────────────────────────
with open(AUTH, "r", encoding="utf-8") as f:
    auth = f.read()

# authRepo est require('../repositories/authRepository') — vérifier qu'il expose pool
# Si non, utiliser database_1 directement
if "authRepo.pool" in auth and "require('../config/database')" not in auth and "require(\"../config/database\")" not in auth:
    # Remplacer authRepo.pool.query par database_1.default.query
    auth = auth.replace("yield authRepo.pool.query(\n            'UPDATE users SET password_hash",
                        "yield database_1.default.query(\n            'UPDATE users SET password_hash")
    auth = auth.replace("const database_1_exists = false; // placeholder", "")
    # Ajouter l'import database_1 si absent
    if "database_1" not in auth:
        auth = auth.replace(
            'const authRepo = __importStar(require("../repositories/authRepository"));',
            'const authRepo = __importStar(require("../repositories/authRepository"));\nconst database_1 = __importDefault(require("../config/database"));'
        )
    with open(AUTH, "w", encoding="utf-8") as f:
        f.write(auth)
    print("OK fix1b : database_1 utilisé pour pool.query dans changePassword")

# ─── 3. Ajouter la route POST /change-password dans authRoutes ───────────────
with open(ROUTES, "r", encoding="utf-8") as f:
    routes = f.read()

OLD_LOGOUT_ROUTE = "router.post('/logout', authController_1.logout);"
NEW_CHANGE_ROUTE = """\
router.post('/logout', authController_1.logout);
router.post('/change-password', authMiddleware_1.authenticateToken, authController_1.changePassword);"""

if OLD_LOGOUT_ROUTE not in routes:
    print("ERREUR : route /logout introuvable dans authRoutes"); sys.exit(1)

# Vérifier que authMiddleware est importé dans authRoutes
if "authMiddleware_1" not in routes:
    OLD_REQUIRE = 'const authController_1 = require("../controllers/authController");'
    NEW_REQUIRE = 'const authController_1 = require("../controllers/authController");\nconst authMiddleware_1 = require("../middleware/authMiddleware");'
    routes = routes.replace(OLD_REQUIRE, NEW_REQUIRE, 1)
    print("OK fix3-import : authMiddleware_1 ajouté dans authRoutes")

routes = routes.replace(OLD_LOGOUT_ROUTE, NEW_CHANGE_ROUTE, 1)
with open(ROUTES, "w", encoding="utf-8") as f:
    f.write(routes)
print("OK fix3 : route POST /api/auth/change-password ajoutée")

print("\nTous les patches appliqués.")
