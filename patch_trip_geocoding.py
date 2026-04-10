"""
Patch 1 — fleetRepository.js : insertTrip inclut start_address et end_address
Patch 2 — tripWorker.js      : geocoding des adresses avant INSERT
"""
import sys

REPO_FILE   = '/var/www/trackyu-gps/backend/dist/repositories/fleetRepository.js'
WORKER_FILE = '/var/www/trackyu-gps/backend/dist/jobs/workers/tripWorker.js'

# ══════════════════════════════════════════════════════════════════════════════
# PATCH 1 — fleetRepository.js : ajouter start_address et end_address à INSERT
# ══════════════════════════════════════════════════════════════════════════════

with open(REPO_FILE, 'r', encoding='utf-8') as f:
    repo = f.read()

OLD_INSERT = """        return client.query(`INSERT INTO trips (object_id, vehicle_id, tenant_id, start_time, end_time, duration_seconds,
       start_lat, start_lng, end_lat, end_lng, distance_km, max_speed_kmh, avg_speed_kmh, positions_count)
     VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     ON CONFLICT DO NOTHING`, [
            trip.object_id,
            (_a = trip.tenant_id) !== null && _a !== void 0 ? _a : null,
            trip.start_time, trip.end_time, durationSeconds,
            trip.start_lat, trip.start_lng, trip.end_lat, trip.end_lng,
            distanceKm, trip.max_speed, avgSpeedKmh, trip.positions_count
        ]);"""

NEW_INSERT = """        return client.query(`INSERT INTO trips (object_id, vehicle_id, tenant_id, start_time, end_time, duration_seconds,
       start_lat, start_lng, start_address, end_lat, end_lng, end_address, distance_km, max_speed_kmh, avg_speed_kmh, positions_count)
     VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     ON CONFLICT DO NOTHING`, [
            trip.object_id,
            (_a = trip.tenant_id) !== null && _a !== void 0 ? _a : null,
            trip.start_time, trip.end_time, durationSeconds,
            trip.start_lat, trip.start_lng, trip.start_address || null,
            trip.end_lat, trip.end_lng, trip.end_address || null,
            distanceKm, trip.max_speed, avgSpeedKmh, trip.positions_count
        ]);"""

if OLD_INSERT not in repo:
    print('ERREUR patch 1 : bloc INSERT introuvable dans fleetRepository.js')
    sys.exit(1)

repo = repo.replace(OLD_INSERT, NEW_INSERT, 1)

with open(REPO_FILE, 'w', encoding='utf-8') as f:
    f.write(repo)

print('OK patch 1 — fleetRepository.js : INSERT inclut start_address + end_address')

# ══════════════════════════════════════════════════════════════════════════════
# PATCH 2 — tripWorker.js : importer ReverseGeocodingService + geocoder avant INSERT
# ══════════════════════════════════════════════════════════════════════════════

with open(WORKER_FILE, 'r', encoding='utf-8') as f:
    worker = f.read()

# 2a. Ajouter l'import du ReverseGeocodingService après l'import utils_1
OLD_IMPORT = 'const utils_1 = require("../../gps-server/utils");'
NEW_IMPORT = '''const utils_1 = require("../../gps-server/utils");
const ReverseGeocodingService_1 = require("../../services/ReverseGeocodingService");'''

if OLD_IMPORT not in worker:
    print('ERREUR patch 2a : import utils_1 introuvable dans tripWorker.js')
    sys.exit(1)

worker = worker.replace(OLD_IMPORT, NEW_IMPORT, 1)

# 2b. Avant la boucle d'insertion (client.query BEGIN), geocoder les adresses
OLD_INSERT_BLOCK = """        const client = yield database_1.default.connect();
        let insertedCount = 0;
        try {
            yield client.query('BEGIN');
            // Delete existing trips for this vehicle+date before re-inserting
            // (allows idempotent recalculation when triggered multiple times per day)
            yield client.query(`DELETE FROM trips WHERE object_id = $1 AND start_time::date = $2::date`, [vehicleId, date]);
            for (const t of trips) {"""

NEW_INSERT_BLOCK = """        // Geocoder les adresses de départ et d'arrivée de chaque trajet
        yield Promise.all(trips.map((t) => __awaiter(void 0, void 0, void 0, function* () {
            const [startAddr, endAddr] = yield Promise.all([
                ReverseGeocodingService_1.ReverseGeocodingService.resolve(t.start_lat, t.start_lng),
                ReverseGeocodingService_1.ReverseGeocodingService.resolve(t.end_lat, t.end_lng),
            ]);
            t.start_address = startAddr || null;
            t.end_address   = endAddr   || null;
        })));
        const client = yield database_1.default.connect();
        let insertedCount = 0;
        try {
            yield client.query('BEGIN');
            // Delete existing trips for this vehicle+date before re-inserting
            // (allows idempotent recalculation when triggered multiple times per day)
            yield client.query(`DELETE FROM trips WHERE object_id = $1 AND start_time::date = $2::date`, [vehicleId, date]);
            for (const t of trips) {"""

if OLD_INSERT_BLOCK not in worker:
    print('ERREUR patch 2b : bloc INSERT client introuvable dans tripWorker.js')
    sys.exit(1)

worker = worker.replace(OLD_INSERT_BLOCK, NEW_INSERT_BLOCK, 1)

with open(WORKER_FILE, 'w', encoding='utf-8') as f:
    f.write(worker)

print('OK patch 2 — tripWorker.js : geocoding start/end avant INSERT')
