const fs = require('fs');
const path = '/app/dist/services/ReverseGeocodingService.js';
let content = fs.readFileSync(path, 'utf8');

// Replace the entire resolve() method body with a clean non-PostGIS version
const oldMethod = /static resolve\(lat, lng\) \{[\s\S]*?return __awaiter\(this, void 0, void 0, function\* \(\) \{[\s\S]*?\}\);[\s\n\r]*\}/;

const newMethod = `static resolve(lat, lng) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!lat || !lng || (lat === 0 && lng === 0))
                return null;
            try {
                // 1. Cache bounding-box (pas de PostGIS — lat/lng float)
                const delta = this.CACHE_DISTANCE_METERS / 111000;
                const cacheResult = yield database_1.default.query(
                    'SELECT address FROM geocoded_addresses WHERE ABS(lat - $1) < $3 AND ABS(lng - $2) < $3 ORDER BY created_at DESC LIMIT 1',
                    [lat, lng, delta]
                );
                if (cacheResult.rows.length > 0) {
                    const addr = cacheResult.rows[0].address;
                    database_1.default.query('UPDATE geocoded_addresses SET last_accessed_at = NOW() WHERE address = $1', [addr]).catch(() => {});
                    return addr;
                }
                // 2. Appel Google Maps
                const address = yield GoogleMapsService_1.GoogleMapsService.reverseGeocode(lat, lng);
                if (address) {
                    // 3. Sauvegarde dans le cache
                    yield database_1.default.query(
                        'INSERT INTO geocoded_addresses (lat, lng, address, provider) VALUES ($1, $2, $3, \'google\') ON CONFLICT DO NOTHING',
                        [lat, lng, address]
                    );
                    return address;
                }
                return null;
            }
            catch (error) {
                logger_1.default.error('[ReverseGeocoding] Error resolving ' + lat + ',' + lng + ':', error.message);
                return null;
            }
        });
    }`;

const fixed = content.replace(oldMethod, newMethod);
if (fixed !== content) {
    fs.writeFileSync(path, fixed, 'utf8');
    console.log('OK: resolve() rewritten without PostGIS');
} else {
    console.log('SKIP: regex did not match resolve() method');
    // Try simpler approach — replace just the problematic query
    const fixed2 = content
        .replace(
            /\/\/ 1\. Chercher dans le cache spatial \(ST_DWithin\)\s+const cacheResult = yield database_1\.default\.query\(`[\s\S]*?`\s*,\s*\[lng,\s*lat,\s*this\.CACHE_DISTANCE_METERS\]\);/,
            `// 1. Cache bounding-box (pas de PostGIS)
                const delta = this.CACHE_DISTANCE_METERS / 111000;
                const cacheResult = yield database_1.default.query(
                    'SELECT address FROM geocoded_addresses WHERE ABS(lat - $1) < $3 AND ABS(lng - $2) < $3 ORDER BY created_at DESC LIMIT 1',
                    [lat, lng, delta]
                );`
        );
    if (fixed2 !== content) {
        fs.writeFileSync(path, fixed2, 'utf8');
        console.log('OK: ST_DWithin query replaced (fallback regex)');
    } else {
        console.log('SKIP: fallback regex also failed');
        // Manual line replacement
        const lines = content.split('\n');
        let inBlock = false;
        let blockStart = -1;
        let blockEnd = -1;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('ST_DWithin')) { inBlock = true; blockStart = i - 1; }
            if (inBlock && lines[i].includes('CACHE_DISTANCE_METERS]')) { blockEnd = i; break; }
        }
        if (blockStart >= 0 && blockEnd >= 0) {
            console.log('Line range:', blockStart, '-', blockEnd);
            console.log('Lines:', lines.slice(blockStart, blockEnd+1).join('\n'));
        }
    }
}
