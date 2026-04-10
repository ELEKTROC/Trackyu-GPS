# -*- coding: utf-8 -*-
"""
Fix day-stats: move SQL queries from objectController into objectRepository,
then update the controller to call the repository method.
"""

# ── 1. objectRepository.js — add getDayStats method ─────────────────────────

repo_path = '/var/www/trackyu-gps/backend/dist/repositories/objectRepository.js'
content = open(repo_path).read()

DAY_STATS_METHOD = '''
    getDayStats(objectId, date) {
        return __awaiter(this, void 0, void 0, function* () {
            const startOfDay = `${date} 00:00:00`;
            const endOfDay   = `${date} 23:59:59`;
            const [tripsRes, stoppedRes, idleRes] = yield Promise.all([
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
            const stoppedSeconds  = parseInt(stoppedRes.rows[0].stopped_seconds) || 0;
            const idleSeconds     = parseInt(idleRes.rows[0].idle_seconds) || 0;
            const totalActive     = drivingSeconds + stoppedSeconds + idleSeconds;
            const offlineSeconds  = Math.max(0, 24 * 3600 - totalActive);
            return {
                date,
                tripsCount:    parseInt(t.trips_count) || 0,
                totalDistance: parseFloat(t.total_distance) || 0,
                maxSpeed:      parseFloat(t.max_speed) || 0,
                avgSpeed:      parseFloat(t.avg_speed) || 0,
                drivingSeconds,
                stoppedSeconds,
                idleSeconds,
                offlineSeconds,
            };
        });
    }
'''

# Insert before setImmobilized (which we know exists)
INSERT_BEFORE = '    // ─── Immobilization ────────────────────────────────────────────────────'
if INSERT_BEFORE in content:
    content = content.replace(INSERT_BEFORE, DAY_STATS_METHOD + '\n' + INSERT_BEFORE, 1)
    open(repo_path, 'w').write(content)
    print('OK: getDayStats added to objectRepository')
else:
    # Try alternate anchor
    alt = '    setImmobilized('
    if alt in content:
        content = content.replace(alt, DAY_STATS_METHOD + '\n    setImmobilized(', 1)
        open(repo_path, 'w').write(content)
        print('OK: getDayStats added (alt anchor)')
    else:
        print('ERROR: anchor not found in objectRepository.js')

# ── 2. objectController.js — replace inline SQL with repository call ─────────

ctrl_path = '/var/www/trackyu-gps/backend/dist/controllers/objectController.js'
content = open(ctrl_path).read()

# Find and replace the entire body of getObjectDayStats that uses database_1
OLD_BODY = '''        const startOfDay = `${date} 00:00:00`;
        const endOfDay = `${date} 23:59:59`;
        // Trips du jour
        const tripsRes = yield database_1.default.query(`
            SELECT
                COUNT(*) as trips_count,
                COALESCE(SUM(distance_km), 0) as total_distance,
                COALESCE(MAX(max_speed_kmh), 0) as max_speed,
                COALESCE(AVG(avg_speed_kmh), 0) as avg_speed,
                COALESCE(SUM(duration_seconds), 0) as driving_seconds
            FROM trips
            WHERE object_id = $1 AND start_time >= $2 AND start_time <= $3
        `, [id, startOfDay, endOfDay]);
        const t = tripsRes.rows[0];
        // Temps arrêté : positions du jour avec speed = 0, statut non offline
        const stoppedRes = yield database_1.default.query(`
            SELECT COUNT(*) * 30 as stopped_seconds
            FROM positions
            WHERE object_id = $1 AND time >= $2 AND time <= $3 AND speed = 0
        `, [id, startOfDay, endOfDay]);
        // Temps ralenti : positions avec 0 < speed < 5
        const idleRes = yield database_1.default.query(`
            SELECT COUNT(*) * 30 as idle_seconds
            FROM positions
            WHERE object_id = $1 AND time >= $2 AND time <= $3 AND speed > 0 AND speed < 5
        `, [id, startOfDay, endOfDay]);
        const drivingSeconds = parseInt(t.driving_seconds) || 0;
        const stoppedSeconds = parseInt(stoppedRes.rows[0].stopped_seconds) || 0;
        const idleSeconds = parseInt(idleRes.rows[0].idle_seconds) || 0;
        const totalActive = drivingSeconds + stoppedSeconds + idleSeconds;
        const daySeconds = 24 * 3600;
        const offlineSeconds = Math.max(0, daySeconds - totalActive);
        res.json({
            date,
            tripsCount: parseInt(t.trips_count) || 0,
            totalDistance: parseFloat(t.total_distance) || 0,
            maxSpeed: parseFloat(t.max_speed) || 0,
            avgSpeed: parseFloat(t.avg_speed) || 0,
            drivingSeconds,
            stoppedSeconds,
            idleSeconds,
            offlineSeconds,
        });'''

NEW_BODY = '''        const stats = yield objectRepository_1.objectRepository.getDayStats(id, date);
        res.json(stats);'''

if OLD_BODY in content:
    content = content.replace(OLD_BODY, NEW_BODY, 1)
    open(ctrl_path, 'w').write(content)
    print('OK: objectController.js updated to use repository')
else:
    print('ERROR: old body not found in objectController.js - checking for database_1 refs:')
    idx = content.find('database_1')
    if idx >= 0:
        print(repr(content[max(0,idx-50):idx+100]))
    else:
        print('No database_1 found in controller - may already be fixed')
