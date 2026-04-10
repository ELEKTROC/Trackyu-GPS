"""
Patch objectRepository.js — getDayStats : ajout estimation trajet en cours

Problème : getDayStats ne lit que la table trips (trajets complétés).
Si le véhicule roule encore, tripsCount=0 et totalDistance=0.

Correction : 4e requête en parallèle qui comptabilise les positions
depuis la fin du dernier trajet complété (ou début de journée) à NOW()
où speed > 5 km/h. Si >= 10 positions → trajet en cours détecté,
drivingSeconds et maxSpeed sont ajoutés aux totaux.
"""
import sys

FILE = '/var/www/trackyu-gps/backend/dist/repositories/objectRepository.js'

with open(FILE, 'r', encoding='utf-8') as f:
    src = f.read()

# ── Bloc 1 : ajouter inProgressRes au Promise.all + 4e query ─────────────────

OLD1 = """            const [tripsRes, stoppedRes, idleRes] = yield Promise.all([
                database_1.default.query(
                    `SELECT COUNT(*) as trips_count, COALESCE(SUM(distance_km),0) as total_distance, COALESCE(MAX(max_speed_kmh),0) as max_speed, COALESCE(AVG(avg_speed_kmh),0) as avg_speed, COALESCE(SUM(duration_seconds),0) as driving_seconds FROM trips WHERE object_id = $1 AND start_time >= $2 AND start_time <= $3`,
                    [objectId, startOfDay, endOfDay]
                ),
                database_1.default.query(
                    `SELECT COUNT(*) * 30 as stopped_seconds FROM positions WHERE object_id = $1 AND time >= $2 AND time <= $3 AND speed = 0`,
                    [objectId, startOfDay, endOfDay]
                ),
                database_1.default.query(
                    `SELECT COUNT(*) * 30 as idle_seconds FROM positions WHERE object_id = $1 AND time >= $2 AND time <= $3 AND speed > 0 AND speed < 5`,
                    [objectId, startOfDay, endOfDay]
                ),
            ]);
            const t = tripsRes.rows[0];
            const drivingSeconds  = parseInt(t.driving_seconds) || 0;
            let stoppedSeconds    = parseInt(stoppedRes.rows[0].stopped_seconds) || 0;
            let idleSeconds       = parseInt(idleRes.rows[0].idle_seconds) || 0;"""

NEW1 = """            const [tripsRes, stoppedRes, idleRes, inProgressRes] = yield Promise.all([
                database_1.default.query(
                    `SELECT COUNT(*) as trips_count, COALESCE(SUM(distance_km),0) as total_distance, COALESCE(MAX(max_speed_kmh),0) as max_speed, COALESCE(AVG(avg_speed_kmh),0) as avg_speed, COALESCE(SUM(duration_seconds),0) as driving_seconds FROM trips WHERE object_id = $1 AND start_time >= $2 AND start_time <= $3`,
                    [objectId, startOfDay, endOfDay]
                ),
                database_1.default.query(
                    `SELECT COUNT(*) * 30 as stopped_seconds FROM positions WHERE object_id = $1 AND time >= $2 AND time <= $3 AND speed = 0`,
                    [objectId, startOfDay, endOfDay]
                ),
                database_1.default.query(
                    `SELECT COUNT(*) * 30 as idle_seconds FROM positions WHERE object_id = $1 AND time >= $2 AND time <= $3 AND speed > 0 AND speed < 5`,
                    [objectId, startOfDay, endOfDay]
                ),
                // Estimation trajet en cours : positions après la fin du dernier trajet complété
                database_1.default.query(
                    `SELECT COUNT(*) as pos_count, COALESCE(MAX(speed), 0) as max_speed, COUNT(*) * 30 as driving_seconds
                     FROM positions
                     WHERE object_id = $1
                       AND time > COALESCE(
                           (SELECT MAX(end_time) FROM trips WHERE object_id = $1 AND start_time >= $2 AND start_time <= $3),
                           $2::timestamp
                       )
                       AND time <= NOW()
                       AND speed > 5`,
                    [objectId, startOfDay, endOfDay]
                ),
            ]);
            const t = tripsRes.rows[0];
            const ip = inProgressRes.rows[0];
            // Trajet en cours si >= 10 positions à vitesse > 5 km/h depuis dernier trajet complété
            const hasInProgressTrip = (parseInt(ip.pos_count) || 0) >= 10;
            let drivingSeconds  = parseInt(t.driving_seconds) || 0;
            if (hasInProgressTrip) drivingSeconds += parseInt(ip.driving_seconds) || 0;
            let stoppedSeconds    = parseInt(stoppedRes.rows[0].stopped_seconds) || 0;
            let idleSeconds       = parseInt(idleRes.rows[0].idle_seconds) || 0;"""

# ── Bloc 2 : retourner tripsCount et maxSpeed incluant le trajet en cours ─────

OLD2 = """            return {
                date,
                tripsCount:    parseInt(t.trips_count) || 0,
                totalDistance: parseFloat(t.total_distance) || 0,
                maxSpeed:      parseFloat(t.max_speed) || 0,
                avgSpeed:      parseFloat(t.avg_speed) || 0,
                drivingSeconds,
                stoppedSeconds,
                idleSeconds,
                offlineSeconds,
            };"""

NEW2 = """            return {
                date,
                tripsCount:    (parseInt(t.trips_count) || 0) + (hasInProgressTrip ? 1 : 0),
                totalDistance: parseFloat(t.total_distance) || 0,
                maxSpeed:      hasInProgressTrip
                    ? Math.max(parseFloat(t.max_speed) || 0, parseFloat(ip.max_speed) || 0)
                    : (parseFloat(t.max_speed) || 0),
                avgSpeed:      parseFloat(t.avg_speed) || 0,
                drivingSeconds,
                stoppedSeconds,
                idleSeconds,
                offlineSeconds,
            };"""

if OLD1 not in src:
    print('ERREUR : bloc 1 (Promise.all) introuvable — vérifier le fichier')
    sys.exit(1)

if OLD2 not in src:
    print('ERREUR : bloc 2 (return statement) introuvable — vérifier le fichier')
    sys.exit(1)

src = src.replace(OLD1, NEW1, 1)
src = src.replace(OLD2, NEW2, 1)

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(src)

print('OK — objectRepository.js patché (getDayStats + in-progress trip)')
