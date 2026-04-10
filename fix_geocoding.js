const fs = require('fs');
const path = '/app/dist/services/ReverseGeocodingService.js';
let content = fs.readFileSync(path, 'utf8');
const hasCRLF = content.includes('\r\n');
const c = content.replace(/\r\n/g, '\n');

// Replace ST_DWithin cache lookup with bounding-box on lat/lng columns
const oldCache = `                // 1. Chercher dans le cache spatial (ST_DWithin)
                const cacheResult = yield database_1.default.query(\`
                SELECT address FROM geocoded_addresses
                WHERE ST_DWithin(
                    location,
                    ST_SetSRID(ST_Point($1, $2), 4326)::geography,
                    $3
                )
                ORDER BY created_at DESC
                LIMIT 1
            \`, [lng, lat, this.CACHE_DISTANCE_METERS]);`;

const newCache = `                // 1. Chercher dans le cache (bounding-box lat/lng — pas de PostGIS)
                const delta = this.CACHE_DISTANCE_METERS / 111000; // ~° per meter
                const cacheResult = yield database_1.default.query(\`
                SELECT address FROM geocoded_addresses
                WHERE ABS(lat - $1) < $3 AND ABS(lng - $2) < $3
                ORDER BY created_at DESC
                LIMIT 1
            \`, [lat, lng, delta]);`;

// Replace PostGIS INSERT with plain lat/lng insert
const oldInsert = `                    yield database_1.default.query(\`
                    INSERT INTO geocoded_addresses (location, address, provider)
                    VALUES (ST_SetSRID(ST_Point($1, $2), 4326), $3, 'google')
                    ON CONFLICT DO NOTHING
                \`, [lng, lat, address]);`;

const newInsert = `                    yield database_1.default.query(\`
                    INSERT INTO geocoded_addresses (lat, lng, address, provider)
                    VALUES ($1, $2, $3, 'google')
                    ON CONFLICT DO NOTHING
                \`, [lat, lng, address]);`;

let patched = c;
let ok = 0;

if (patched.includes(oldCache)) {
    patched = patched.replace(oldCache, newCache);
    console.log('OK: cache lookup patched (ST_DWithin → bounding-box)');
    ok++;
} else {
    console.log('SKIP: cache lookup pattern not found');
}

if (patched.includes(oldInsert)) {
    patched = patched.replace(oldInsert, newInsert);
    console.log('OK: cache insert patched (location geometry → lat/lng)');
    ok++;
} else {
    console.log('SKIP: cache insert pattern not found');
}

if (ok > 0) {
    if (hasCRLF) patched = patched.replace(/\n/g, '\r\n');
    fs.writeFileSync(path, patched, 'utf8');
    console.log('WRITTEN:', path);
}
