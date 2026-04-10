"""
Patch fleetRoutes.js — ajouter GET /fleet/geocode?lat=&lng=
Utilise ReverseGeocodingService (cache 20m + Google Maps API)
"""
import sys

FILE = '/var/www/trackyu-gps/backend/dist/routes/fleetRoutes.js'

with open(FILE, 'r', encoding='utf-8') as f:
    src = f.read()

OLD = """const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const fleetController_1 = require("../controllers/fleetController");"""

NEW = """const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const fleetController_1 = require("../controllers/fleetController");
const ReverseGeocodingService_1 = require("../services/ReverseGeocodingService");"""

if OLD not in src:
    print('ERREUR : bloc require introuvable dans fleetRoutes.js')
    sys.exit(1)

src = src.replace(OLD, NEW, 1)

OLD2 = 'exports.default = router;'
NEW2 = """// Reverse geocoding (cache backend partagé)
router.get('/geocode', (0, authMiddleware_1.requirePermission)('VIEW_FLEET'), async (req, res) => {
    try {
        const lat = parseFloat(req.query.lat);
        const lng = parseFloat(req.query.lng);
        if (isNaN(lat) || isNaN(lng)) return res.status(400).json({ error: 'lat/lng invalides' });
        const address = await ReverseGeocodingService_1.ReverseGeocodingService.resolve(lat, lng);
        res.json({ address: address || null });
    } catch (e) {
        res.json({ address: null });
    }
});
exports.default = router;"""

if OLD2 not in src:
    print('ERREUR : exports.default introuvable dans fleetRoutes.js')
    sys.exit(1)

src = src.replace(OLD2, NEW2, 1)

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(src)

print('OK — fleetRoutes.js patché (GET /fleet/geocode)')
