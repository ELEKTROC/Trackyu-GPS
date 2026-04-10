# -*- coding: utf-8 -*-
"""
patch_client_bugs.py
Correctifs bugs CLIENT détectés lors des tests

1. ticketController.js   — GET /tickets/my : filtrer par client_id (pas created_by)
2. userController.js     — PUT /users/:id : autoriser CLIENT à modifier son propre profil
"""
import subprocess, sys

def exec_remote(cmd):
    r = subprocess.run(["ssh", "trackyu-vps", cmd], capture_output=True, text=True, encoding='utf-8', errors='replace')
    return r.stdout, r.stderr, r.returncode

def read_file(path):
    out, err, rc = exec_remote(f"docker exec trackyu-gps-backend-1 cat {path}")
    if rc != 0:
        print(f"ERR read {path}: {err}"); sys.exit(1)
    return out

def write_file(path, content):
    cmd = f"docker exec -i trackyu-gps-backend-1 sh -c 'cat > {path}'"
    r = subprocess.run(["ssh", "trackyu-vps", cmd], input=content, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if r.returncode != 0:
        print(f"ERR write {path}: {r.stderr}"); sys.exit(1)
    print(f"  WRITTEN {path}")

def patch(content, old, new, label):
    if old not in content:
        print(f"  SKIP (not found): {label}")
        return content
    result = content.replace(old, new, 1)
    print(f"  OK: {label}")
    return result

BASE = "/app/dist"

# ═══════════════════════════════════════════════════════════════════
# 1. ticketController.js — GET /tickets/my
#    Actuellement filtre uniquement par created_by = userId
#    → doit aussi inclure les tickets liés au client (client_id)
# ═══════════════════════════════════════════════════════════════════
print("\n[1/2] ticketController.js — GET /tickets/my : ajouter filtre client_id")
ctrl_path = f"{BASE}/controllers/ticketController.js"
content = read_file(ctrl_path)

# On cherche la fonction getMyTickets ou la route /my
# Elle filtre probablement par created_by = userId
content = patch(content,
    '''const getMyTickets = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    try {
        const tickets = yield ticketRepository_1.ticketRepository.findByUser(userId);''',
    '''const getMyTickets = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const clientId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.clientId;
    try {
        const tickets = yield ticketRepository_1.ticketRepository.findByUser(userId, clientId);''',
    "getMyTickets: pass clientId to findByUser"
)

# Variante si la signature est différente
content = patch(content,
    '''const getMyTickets = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    try {
        const tickets = yield ticketRepository_1.ticketRepository.findByCreatedBy(userId);''',
    '''const getMyTickets = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const clientId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.clientId;
    try {
        const tickets = yield ticketRepository_1.ticketRepository.findByCreatedBy(userId, clientId);''',
    "getMyTickets (findByCreatedBy variant): pass clientId"
)

write_file(ctrl_path, content)

# ═══════════════════════════════════════════════════════════════════
# 1b. ticketRepository.js — findByUser / findByCreatedBy
#     Ajouter OR client_id = $2 pour que les tickets CLIENT soient visibles
# ═══════════════════════════════════════════════════════════════════
print("\n[1b/2] ticketRepository.js — findByUser : OR client_id")
repo_path = f"{BASE}/repositories/ticketRepository.js"
content = read_file(repo_path)

# Chercher findByUser avec WHERE created_by = $1
content = patch(content,
    '''findByUser(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield database_1.default.query(
                `SELECT * FROM tickets WHERE created_by = $1 ORDER BY created_at DESC`,
                [userId]
            );
            return result.rows;
        });
    }''',
    '''findByUser(userId, clientId) {
        return __awaiter(this, void 0, void 0, function* () {
            let query = `SELECT * FROM tickets WHERE created_by = $1`;
            const params = [userId];
            if (clientId) {
                query += ` OR client_id = $2`;
                params.push(clientId);
            }
            query += ` ORDER BY created_at DESC`;
            const result = yield database_1.default.query(query, params);
            return result.rows;
        });
    }''',
    "ticketRepository.findByUser: add OR client_id"
)

content = patch(content,
    '''findByCreatedBy(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield database_1.default.query(
                `SELECT * FROM tickets WHERE created_by = $1 ORDER BY created_at DESC`,
                [userId]
            );
            return result.rows;
        });
    }''',
    '''findByCreatedBy(userId, clientId) {
        return __awaiter(this, void 0, void 0, function* () {
            let query = `SELECT * FROM tickets WHERE created_by = $1`;
            const params = [userId];
            if (clientId) {
                query += ` OR client_id = $2`;
                params.push(clientId);
            }
            query += ` ORDER BY created_at DESC`;
            const result = yield database_1.default.query(query, params);
            return result.rows;
        });
    }''',
    "ticketRepository.findByCreatedBy: add OR client_id"
)

write_file(repo_path, content)

# ═══════════════════════════════════════════════════════════════════
# 2. userController.js — PUT /users/:id
#    Actuellement requiert MANAGE_USERS → CLIENT ne peut pas modifier son profil
#    Fix : si l'user modifie son propre profil, autoriser (uniquement name/phone)
# ═══════════════════════════════════════════════════════════════════
print("\n[2/2] userController.js — PUT /users/:id : autoriser CLIENT à modifier son propre profil")
user_ctrl = f"{BASE}/controllers/userController.js"
content = read_file(user_ctrl)

# Chercher la vérification de permission pour updateUser
# On autorise si userId === requester id (self-update), champs restreints à name/phone
content = patch(content,
    '''const updateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const { id } = req.params;
    const requesterId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const requesterRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
    if (!(0, permissionHelper_1.hasPermission)(requesterRole, 'MANAGE_USERS')) {
        return res.status(403).json({ message: 'Forbidden: Insufficient permissions', requiredPermission: 'MANAGE_USERS' });
    }''',
    '''const updateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const { id } = req.params;
    const requesterId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const requesterRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
    const isSelfUpdate = requesterId === id;
    if (!isSelfUpdate && !(0, permissionHelper_1.hasPermission)(requesterRole, 'MANAGE_USERS')) {
        return res.status(403).json({ message: 'Forbidden: Insufficient permissions', requiredPermission: 'MANAGE_USERS' });
    }
    // Self-update : restreindre aux champs autorisés (pas de changement de rôle)
    if (isSelfUpdate && !(0, permissionHelper_1.hasPermission)(requesterRole, 'MANAGE_USERS')) {
        const { name, phone } = req.body;
        if (!name && !phone) {
            return res.status(400).json({ message: 'Aucun champ à mettre à jour' });
        }
        req.body = Object.assign({}, name !== undefined ? { name } : {}, phone !== undefined ? { phone } : {});
    }''',
    "updateUser: allow self-update for non-admin users"
)

write_file(user_ctrl, content)

# ═══════════════════════════════════════════════════════════════════
# RESTART
# ═══════════════════════════════════════════════════════════════════
print("\n[RESTART] Redémarrage du backend...")
r = subprocess.run(["ssh", "trackyu-vps", "docker restart trackyu-gps-backend-1"],
                   capture_output=True, text=True)
print(r.stdout.strip() or r.stderr.strip())
print("\nDone.")
