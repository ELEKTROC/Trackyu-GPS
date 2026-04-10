"""
patch_client_isolation.py
Corrige l'isolation des données CLIENT sur le VPS.
5 fichiers patchés pour que chaque CLIENT ne voie que sa propre flotte.
"""
import subprocess, sys

PSQL = ["ssh", "trackyu-vps"]

def exec_remote(cmd):
    r = subprocess.run(["ssh", "trackyu-vps", cmd], capture_output=True, text=True)
    return r.stdout, r.stderr, r.returncode

def read_file(path):
    out, err, rc = exec_remote(f"docker exec trackyu-gps-backend-1 cat {path}")
    if rc != 0:
        print(f"ERR read {path}: {err}"); sys.exit(1)
    return out

def write_file(path, content):
    # Escape single quotes in content for shell
    escaped = content.replace("'", "'\\''")
    cmd = f"docker exec -i trackyu-gps-backend-1 sh -c 'cat > {path}'"
    r = subprocess.run(["ssh", "trackyu-vps", cmd], input=content, capture_output=True, text=True)
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
# FIX 1 — tierHelper.js : lookup users.client_id en priorité 0
# ═══════════════════════════════════════════════════════════════════
print("\n[1/5] tierHelper.js — lookup direct users.client_id")
path = f"{BASE}/utils/tierHelper.js"
content = read_file(path)

content = patch(content,
    '''function resolveClientTierId(userId, email, tenantId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (email && email.trim() !== '') {''',
    '''function resolveClientTierId(userId, email, tenantId) {
    return __awaiter(this, void 0, void 0, function* () {
        // 0. Lookup direct users.client_id (fastest and handles no-email accounts)
        if (userId) {
            const directRes = yield db_1.default.query('SELECT client_id FROM users WHERE id = $1 AND client_id IS NOT NULL', [userId]);
            if (directRes.rows.length > 0 && directRes.rows[0].client_id) {
                return directRes.rows[0].client_id;
            }
        }
        if (email && email.trim() !== '') {''',
    "resolveClientTierId: add users.client_id lookup"
)

write_file(path, content)

# ═══════════════════════════════════════════════════════════════════
# FIX 2 — objectController.js : passer clientId aux 3 fonctions manquantes
# ═══════════════════════════════════════════════════════════════════
print("\n[2/5] objectController.js — passer clientId à history/fuel/maintenance")
path = f"{BASE}/controllers/objectController.js"
content = read_file(path)

# 2a. getObjectHistorySnapped — verifyAccess sans clientId
content = patch(content,
    '''    const { id } = req.params;
    const { date } = req.query;
    const tenantId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.tenantId) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.tenant_id);
    try {
        const hasAccess = yield objectRepository_1.objectRepository.verifyAccess(id, tenantId);''',
    '''    const { id } = req.params;
    const { date } = req.query;
    const tenantId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.tenantId) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.tenant_id);
    const _clientIdHist = (_c = req.user) === null || _c === void 0 ? void 0 : _c.clientId;
    try {
        const hasAccess = yield objectRepository_1.objectRepository.verifyAccess(id, tenantId, _clientIdHist);''',
    "getObjectHistorySnapped: pass clientId to verifyAccess"
)

# 2b. getAllObjectFuelRecords — sans clientId
content = patch(content,
    '''const getAllObjectFuelRecords = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const tenantId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.tenantId) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.tenant_id);
    try {
        const records = yield objectRepository_1.objectRepository.getAllFuelRecords(tenantId);''',
    '''const getAllObjectFuelRecords = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const tenantId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.tenantId) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.tenant_id);
    const _clientIdFuel = (_c = req.user) === null || _c === void 0 ? void 0 : _c.clientId;
    try {
        const records = yield objectRepository_1.objectRepository.getAllFuelRecords(tenantId, _clientIdFuel);''',
    "getAllObjectFuelRecords: pass clientId"
)

# 2c. getAllObjectMaintenanceRecords — sans clientId
content = patch(content,
    '''const getAllObjectMaintenanceRecords = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const tenantId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.tenantId) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.tenant_id);
    try {
        const records = yield objectRepository_1.objectRepository.getAllMaintenanceRecords(tenantId);''',
    '''const getAllObjectMaintenanceRecords = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const tenantId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.tenantId) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.tenant_id);
    const _clientIdMaint = (_c = req.user) === null || _c === void 0 ? void 0 : _c.clientId;
    try {
        const records = yield objectRepository_1.objectRepository.getAllMaintenanceRecords(tenantId, _clientIdMaint);''',
    "getAllObjectMaintenanceRecords: pass clientId"
)

write_file(path, content)

# ═══════════════════════════════════════════════════════════════════
# FIX 3 — objectRepository.js : filtrer par client_id dans 3 fonctions
# ═══════════════════════════════════════════════════════════════════
print("\n[3/5] objectRepository.js — filtrer client_id dans verifyAccess/fuel/maintenance")
path = f"{BASE}/repositories/objectRepository.js"
content = read_file(path)

# 3a. verifyAccess — ajouter clientId param + filtre
content = patch(content,
    '''    verifyAccess(objectId, tenantId) {
        return __awaiter(this, void 0, void 0, function* () {
            const params = [objectId];
            let query = 'SELECT id FROM objects WHERE id = $1';
            if (tenantId && !(0, tenantHelper_1.isStaffUser)(tenantId)) {
                query += ' AND tenant_id = $2';
                params.push(tenantId);
            }
            const result = yield database_1.default.query(query, params);
            return result.rows.length > 0;
        });
    }''',
    '''    verifyAccess(objectId, tenantId, clientId) {
        return __awaiter(this, void 0, void 0, function* () {
            const params = [objectId];
            let query = 'SELECT id FROM objects WHERE id = $1';
            if (tenantId && !(0, tenantHelper_1.isStaffUser)(tenantId)) {
                query += ' AND tenant_id = $2';
                params.push(tenantId);
                if (clientId) {
                    query += ' AND client_id = $3';
                    params.push(clientId);
                }
            }
            const result = yield database_1.default.query(query, params);
            return result.rows.length > 0;
        });
    }''',
    "verifyAccess: add clientId filter"
)

# 3b. getAllFuelRecords — ajouter clientId param + filtre
content = patch(content,
    '''    getAllFuelRecords(tenantId) {
        return __awaiter(this, void 0, void 0, function* () {
            const filterByTenant = tenantId && !(0, tenantHelper_1.isStaffUser)(tenantId);
            let query = `
      SELECT fr.*, v.name as vehicle_name, v.plate as plate_number
      FROM fuel_records fr JOIN objects v ON fr.object_id = v.id
    `;
            const params = [];
            if (filterByTenant) {
                query += ' WHERE v.tenant_id = $1';
                params.push(tenantId);
            }
            query += ' ORDER BY fr.date DESC LIMIT 500';
            return (yield database_1.default.query(query, params)).rows;
        });
    }''',
    '''    getAllFuelRecords(tenantId, clientId) {
        return __awaiter(this, void 0, void 0, function* () {
            const filterByTenant = tenantId && !(0, tenantHelper_1.isStaffUser)(tenantId);
            let query = `
      SELECT fr.*, v.name as vehicle_name, v.plate as plate_number
      FROM fuel_records fr JOIN objects v ON fr.object_id = v.id
    `;
            const params = [];
            if (filterByTenant) {
                query += ' WHERE v.tenant_id = $1';
                params.push(tenantId);
                if (clientId) {
                    query += ' AND v.client_id = $2';
                    params.push(clientId);
                }
            }
            query += ' ORDER BY fr.date DESC LIMIT 500';
            return (yield database_1.default.query(query, params)).rows;
        });
    }''',
    "getAllFuelRecords: add clientId filter"
)

# 3c. getAllMaintenanceRecords — ajouter clientId param + filtre
content = patch(content,
    '''    getAllMaintenanceRecords(tenantId) {
        return __awaiter(this, void 0, void 0, function* () {
            const filterByTenant = tenantId && !(0, tenantHelper_1.isStaffUser)(tenantId);
            let query = `
      SELECT mr.*, v.name as vehicle_name, v.plate as plate_number
      FROM maintenance_records mr JOIN objects v ON mr.object_id = v.id
    `;
            const params = [];
            if (filterByTenant) {
                query += ' WHERE v.tenant_id = $1';
                params.push(tenantId);
            }
            query += ' ORDER BY mr.date DESC LIMIT 500';
            return (yield database_1.default.query(query, params)).rows;
        });
    }''',
    '''    getAllMaintenanceRecords(tenantId, clientId) {
        return __awaiter(this, void 0, void 0, function* () {
            const filterByTenant = tenantId && !(0, tenantHelper_1.isStaffUser)(tenantId);
            let query = `
      SELECT mr.*, v.name as vehicle_name, v.plate as plate_number
      FROM maintenance_records mr JOIN objects v ON mr.object_id = v.id
    `;
            const params = [];
            if (filterByTenant) {
                query += ' WHERE v.tenant_id = $1';
                params.push(tenantId);
                if (clientId) {
                    query += ' AND v.client_id = $2';
                    params.push(clientId);
                }
            }
            query += ' ORDER BY mr.date DESC LIMIT 500';
            return (yield database_1.default.query(query, params)).rows;
        });
    }''',
    "getAllMaintenanceRecords: add clientId filter"
)

write_file(path, content)

# ═══════════════════════════════════════════════════════════════════
# FIX 4 — alertController.js : passer clientId à findAlerts
# ═══════════════════════════════════════════════════════════════════
print("\n[4/5] alertController.js — passer clientId à findAlerts")
path = f"{BASE}/controllers/alertController.js"
content = read_file(path)

content = patch(content,
    '''        const tenantId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.tenantId) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.tenant_id);
        const { type, severity, isRead, treated, startDate, endDate, limit = '500', offset = '0' } = req.query;
        const alerts = yield alertRepo.findAlerts({
            tenantId,
            isStaff: (0, tenantHelper_1.isStaffUser)(tenantId),''',
    '''        const tenantId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.tenantId) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.tenant_id);
        const _clientIdAlerts = (_c = req.user) === null || _c === void 0 ? void 0 : _c.clientId;
        const { type, severity, isRead, treated, startDate, endDate, limit = '500', offset = '0' } = req.query;
        const alerts = yield alertRepo.findAlerts({
            tenantId,
            clientId: _clientIdAlerts,
            isStaff: (0, tenantHelper_1.isStaffUser)(tenantId),''',
    "getAlerts: pass clientId to findAlerts"
)

# Fix the var declaration (_c missing)
content = patch(content,
    '''    var _a, _b;
    try {
        const tenantId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.tenantId) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.tenant_id);
        const _clientIdAlerts''',
    '''    var _a, _b, _c;
    try {
        const tenantId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.tenantId) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.tenant_id);
        const _clientIdAlerts''',
    "getAlerts: fix var _c declaration"
)

write_file(path, content)

# ═══════════════════════════════════════════════════════════════════
# FIX 5 — alertRepository.js : filtrer par v.client_id dans findAlerts
# ═══════════════════════════════════════════════════════════════════
print("\n[5/5] alertRepository.js — ajouter filtre client_id dans findAlerts")
path = f"{BASE}/repositories/alertRepository.js"
content = read_file(path)

content = patch(content,
    '''        if (!filters.isStaff) {
            if (!filters.tenantId)
                throw new Error('tenantId is required for non-staff users');
            conditions.push(`v.tenant_id = $${paramIdx++}`);
            params.push(filters.tenantId);
        }
        if (filters.type) {''',
    '''        if (!filters.isStaff) {
            if (!filters.tenantId)
                throw new Error('tenantId is required for non-staff users');
            conditions.push(`v.tenant_id = $${paramIdx++}`);
            params.push(filters.tenantId);
            if (filters.clientId) {
                conditions.push(`v.client_id = $${paramIdx++}`);
                params.push(filters.clientId);
            }
        }
        if (filters.type) {''',
    "findAlerts: add clientId filter condition"
)

write_file(path, content)

# ═══════════════════════════════════════════════════════════════════
# RESTART backend
# ═══════════════════════════════════════════════════════════════════
print("\n[RESTART] Redémarrage du backend...")
r = subprocess.run(["ssh", "trackyu-vps", "docker restart trackyu-gps-backend-1"],
                   capture_output=True, text=True)
print(r.stdout.strip() or r.stderr.strip())
print("\nDone.")
