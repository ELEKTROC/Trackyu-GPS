/**
 * B1 — Add GET /fleet/vehicles/:id/daily-range endpoint
 * Returns [{date, tripsCount, totalDistance}] for a date range (one SQL query)
 */
const fs = require('fs');

// ── 1. objectRepository.js — add getDailyRange() ─────────────────────────────
const repoPath = '/app/dist/repositories/objectRepository.js';
let repo = fs.readFileSync(repoPath, 'utf8').replace(/\r\n/g, '\n');

const getDailyRangeMethod = `
    getDailyRange(objectId, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield database_1.default.query(
                \`SELECT
                    start_time::date AS day,
                    COUNT(*) AS trips_count,
                    COALESCE(SUM(distance_km), 0) AS total_distance
                 FROM trips
                 WHERE object_id = $1
                   AND start_time::date >= $2::date
                   AND start_time::date <= $3::date
                 GROUP BY start_time::date
                 ORDER BY start_time::date DESC\`,
                [objectId, startDate, endDate]
            );
            return result.rows.map(r => ({
                date: r.day instanceof Date
                    ? r.day.toISOString().slice(0, 10)
                    : String(r.day).slice(0, 10),
                tripsCount:    parseInt(r.trips_count) || 0,
                totalDistance: parseFloat(r.total_distance) || 0,
            }));
        });
    }
`;

if (repo.includes('getDailyRange')) {
    console.log('SKIP repo: getDailyRange already exists');
} else {
    // Insert before the Immobilization section
    const marker = '// ─── Immobilization';
    if (repo.includes(marker)) {
        repo = repo.replace(marker, getDailyRangeMethod + '\n    ' + marker);
        fs.writeFileSync(repoPath, repo, 'utf8');
        console.log('OK repo: getDailyRange added');
    } else {
        // Fallback: insert before the closing brace of the class/object
        // Find getDayStats closing }) and insert after
        const fallbackMarker = 'exports.objectRepository = new ObjectRepository';
        if (repo.includes(fallbackMarker)) {
            repo = repo.replace(fallbackMarker, getDailyRangeMethod + '\n' + fallbackMarker);
            fs.writeFileSync(repoPath, repo, 'utf8');
            console.log('OK repo (fallback): getDailyRange added');
        } else {
            console.log('FAIL repo: no insertion marker found');
            process.exit(1);
        }
    }
}

// ── 2. objectController.js — add getObjectDailyRange handler ─────────────────
const ctrlPath = '/app/dist/controllers/objectController.js';
let ctrl = fs.readFileSync(ctrlPath, 'utf8').replace(/\r\n/g, '\n');

const dailyRangeHandler = `
const getObjectDailyRange = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _dr;
    const { id } = req.params;
    const { startDate, endDate } = req.query;
    const tenantId = ((_dr = req.user) === null || _dr === void 0 ? void 0 : _dr.tenantId) || (req.user && req.user.tenant_id);
    if (!startDate || !endDate) {
        return res.status(400).json({ message: 'startDate and endDate are required (YYYY-MM-DD)' });
    }
    try {
        const hasAccess = yield objectRepository_1.objectRepository.verifyAccess(id, tenantId, req.user && req.user.clientId);
        if (!hasAccess) return res.status(404).json({ message: 'Object not found or access denied' });
        const data = yield objectRepository_1.objectRepository.getDailyRange(id, startDate, endDate);
        return res.json(data);
    } catch (error) {
        logger_1.default.error('Error fetching daily range for object ' + id + ':', error.message);
        return res.status(500).json({ message: 'Error fetching daily range' });
    }
});
exports.getObjectDailyRange = getObjectDailyRange;
`;

if (ctrl.includes('getObjectDailyRange')) {
    console.log('SKIP ctrl: getObjectDailyRange already exists');
} else {
    // Insert before getObjectDayStats
    const ctrlMarker = 'const getObjectDayStats';
    if (ctrl.includes(ctrlMarker)) {
        ctrl = ctrl.replace(ctrlMarker, dailyRangeHandler + '\n' + ctrlMarker);
        fs.writeFileSync(ctrlPath, ctrl, 'utf8');
        console.log('OK ctrl: getObjectDailyRange added');
    } else {
        console.log('FAIL ctrl: marker not found');
        process.exit(1);
    }
}

// ── 3. fleetRoutes.js — add GET /vehicles/:id/daily-range route ──────────────
const routesPath = '/app/dist/routes/fleetRoutes.js';
let routes = fs.readFileSync(routesPath, 'utf8').replace(/\r\n/g, '\n');

if (routes.includes('daily-range')) {
    console.log('SKIP routes: daily-range already exists');
} else {
    // Add import of getObjectDailyRange to the objectController destructure
    // Find how the controller is imported
    const importMarker = 'getObjectDayStats';
    if (routes.includes(importMarker)) {
        // Insert the new route after day-stats route
        const routeMarker = "router.get('/vehicles/:id/day-stats'";
        if (routes.includes(routeMarker)) {
            routes = routes.replace(
                routeMarker,
                "router.get('/vehicles/:id/daily-range', (0, authMiddleware_1.requirePermission)('VIEW_FLEET'), objectController.getObjectDailyRange);\n" +
                routeMarker
            );
            fs.writeFileSync(routesPath, routes, 'utf8');
            console.log('OK routes: GET /vehicles/:id/daily-range added');
        } else {
            console.log('FAIL routes: day-stats route marker not found');
            process.exit(1);
        }
    } else {
        console.log('FAIL routes: objectController import marker not found');
        process.exit(1);
    }
}

console.log('\nDone. Restart backend to apply.');
