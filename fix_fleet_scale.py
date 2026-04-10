# -*- coding: utf-8 -*-
"""
fix_fleet_scale.py
Architecture "Option B" — Scale 5k-10k véhicules

1. objectRepository.js  — retirer daily_mileage / last_trip_distance (sous-requêtes ×N)
                        — ajouter findInBounds (endpoint map viewport)
2. objectController.js  — ajouter getObjectsInBounds
3. objectRoutes.js      — ajouter GET /map → getObjectsInBounds
"""
import subprocess, sys

def exec_remote(cmd):
    r = subprocess.run(["ssh", "trackyu-vps", cmd], capture_output=True, text=True)
    return r.stdout, r.stderr, r.returncode

def read_file(path):
    out, err, rc = exec_remote(f"docker exec trackyu-gps-backend-1 cat {path}")
    if rc != 0:
        print(f"ERR read {path}: {err}"); sys.exit(1)
    return out

def write_file(path, content):
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
# 1. objectRepository.js
# ═══════════════════════════════════════════════════════════════════
print("\n[1/3] objectRepository.js")
repo_path = f"{BASE}/repositories/objectRepository.js"
content = read_file(repo_path)

# ── 1a. Retirer les sous-requêtes corrélées de findAllWithPosition ──
# Ces deux lignes s'exécutent N fois (une par véhicule) → inacceptable à 5-10k véhicules
# normalizeVehicle() côté mobile n'utilise pas ces champs : suppression sans impact client.
content = patch(content,
    '''            COALESCE((SELECT SUM(tr.distance_km) FROM trips tr WHERE tr.object_id = o.id AND tr.start_time::date = CURRENT_DATE), 0) as daily_mileage,
            (SELECT tr.distance_km FROM trips tr WHERE tr.object_id = o.id ORDER BY tr.start_time DESC LIMIT 1) as last_trip_distance,''',
    '',
    "findAllWithPosition: remove daily_mileage + last_trip_distance correlated subqueries"
)

# Variante sans virgule finale (si c'était le dernier SELECT item avant FROM)
content = patch(content,
    '''            COALESCE((SELECT SUM(tr.distance_km) FROM trips tr WHERE tr.object_id = o.id AND tr.start_time::date = CURRENT_DATE), 0) as daily_mileage,
            (SELECT tr.distance_km FROM trips tr WHERE tr.object_id = o.id ORDER BY tr.start_time DESC LIMIT 1) as last_trip_distance''',
    '',
    "findAllWithPosition: remove daily_mileage + last_trip_distance (no trailing comma)"
)

# ── 1b. Ajouter findInBounds juste avant la fermeture de la classe ──
# Retourne uniquement les colonnes légères dont le mobile a besoin pour afficher les marqueurs.
# Utilise la dernière position connue (positions JOIN LATERAL pour éviter le subquery ×N).
FIND_IN_BOUNDS = '''
    findInBounds(tenantId, clientId, swLat, swLng, neLat, neLng) {
        return __awaiter(this, void 0, void 0, function* () {
            const params = [
                parseFloat(swLat), parseFloat(swLng),
                parseFloat(neLat), parseFloat(neLng),
            ];
            let idx = 5;
            let tenantFilter = '';
            let clientFilter = '';
            if (tenantId && !(0, tenantHelper_1.isStaffUser)(tenantId)) {
                tenantFilter = `AND o.tenant_id = $${idx++}`;
                params.push(tenantId);
                if (clientId) {
                    clientFilter = `AND o.client_id = $${idx++}`;
                    params.push(clientId);
                }
            }
            const sql = `
                SELECT
                    o.id,
                    o.name,
                    o.plate,
                    o.status,
                    o.icon,
                    p.latitude  AS lat,
                    p.longitude AS lng,
                    p.speed,
                    p.time      AS last_update
                FROM objects o
                JOIN LATERAL (
                    SELECT latitude, longitude, speed, time
                    FROM positions
                    WHERE object_id = o.id
                    ORDER BY time DESC
                    LIMIT 1
                ) p ON TRUE
                WHERE
                    p.latitude  BETWEEN $1 AND $3
                    AND p.longitude BETWEEN $2 AND $4
                    ${tenantFilter}
                    ${clientFilter}
                ORDER BY o.name
            `;
            return (yield database_1.default.query(sql, params)).rows;
        });
    }
'''

# On insère juste avant la dernière accolade fermante de l'objet objectRepository
content = patch(content,
    '''};
exports.objectRepository = objectRepository;''',
    FIND_IN_BOUNDS + '''};
exports.objectRepository = objectRepository;''',
    "objectRepository: add findInBounds method"
)

write_file(repo_path, content)

# ═══════════════════════════════════════════════════════════════════
# 2. objectController.js — ajouter getObjectsInBounds
# ═══════════════════════════════════════════════════════════════════
print("\n[2/3] objectController.js — ajouter getObjectsInBounds")
ctrl_path = f"{BASE}/controllers/objectController.js"
content = read_file(ctrl_path)

GET_OBJECTS_IN_BOUNDS = '''
const getObjectsInBounds = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _mba, _mbb, _mbc;
    const { swLat, swLng, neLat, neLng } = req.query;
    if (!swLat || !swLng || !neLat || !neLng) {
        return res.status(400).json({ message: 'swLat, swLng, neLat, neLng sont requis' });
    }
    const tenantId = ((_mba = req.user) === null || _mba === void 0 ? void 0 : _mba.tenantId) || ((_mbb = req.user) === null || _mbb === void 0 ? void 0 : _mbb.tenant_id);
    const clientId = (_mbc = req.user) === null || _mbc === void 0 ? void 0 : _mbc.clientId;
    try {
        const vehicles = yield objectRepository_1.objectRepository.findInBounds(tenantId, clientId, swLat, swLng, neLat, neLng);
        return res.json({ data: vehicles, total: vehicles.length });
    }
    catch (err) {
        console.error('getObjectsInBounds error:', err);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
});

'''

# Insérer juste avant les exports
content = patch(content,
    '''exports.getObjects = getObjects;''',
    GET_OBJECTS_IN_BOUNDS + '''exports.getObjects = getObjects;''',
    "objectController: add getObjectsInBounds"
)

# Ajouter l'export de getObjectsInBounds
content = patch(content,
    '''exports.getObjects = getObjects;''',
    '''exports.getObjects = getObjects;
exports.getObjectsInBounds = getObjectsInBounds;''',
    "objectController: export getObjectsInBounds"
)

write_file(ctrl_path, content)

# ═══════════════════════════════════════════════════════════════════
# 3. objectRoutes.js — ajouter GET /map
# ═══════════════════════════════════════════════════════════════════
print("\n[3/3] objectRoutes.js — ajouter GET /map")
routes_path = f"{BASE}/routes/objectRoutes.js"
content = read_file(routes_path)

# Ajouter l'import de getObjectsInBounds dans le destructuring existant
content = patch(content,
    '''const { getObjects,''',
    '''const { getObjects, getObjectsInBounds,''',
    "objectRoutes: import getObjectsInBounds"
)

# Ajouter la route GET /map avant la première route router.get existante
content = patch(content,
    '''router.get('/', auth_1.authenticate, objectController_1.getObjects);''',
    '''router.get('/map', auth_1.authenticate, objectController_1.getObjectsInBounds);
router.get('/', auth_1.authenticate, objectController_1.getObjects);''',
    "objectRoutes: add GET /map route"
)

write_file(routes_path, content)

# ═══════════════════════════════════════════════════════════════════
# RESTART
# ═══════════════════════════════════════════════════════════════════
print("\n[RESTART] Redémarrage du backend...")
r = subprocess.run(["ssh", "trackyu-vps", "docker restart trackyu-gps-backend-1"],
                   capture_output=True, text=True)
print(r.stdout.strip() or r.stderr.strip())

print("\n✓ fix_fleet_scale.py terminé.")
print("  Nouvel endpoint : GET /api/v1/objects/map?swLat=&swLng=&neLat=&neLng=")
print("  findAllWithPosition : daily_mileage + last_trip_distance supprimés")
