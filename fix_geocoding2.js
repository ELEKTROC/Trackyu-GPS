const fs = require('fs');
const path = '/app/dist/services/ReverseGeocodingService.js';
let content = fs.readFileSync(path, 'utf8');

// Replace everything between the class body's resolve method cache section
// Use a regex to target the ST_DWithin block regardless of line endings
const fixed = content.replace(
    /\/\/ 1\. Chercher dans le cache spatial \(ST_DWithin\)[\s\S]*?LIMIT 1\s*`\s*\],\s*\[lng,\s*lat,\s*this\.CACHE_DISTANCE_METERS\]\);/,
    `// 1. Chercher dans le cache (bounding-box lat/lng — pas de PostGIS)
                const delta = this.CACHE_DISTANCE_METERS / 111000; // ~° par mètre
                const cacheResult = yield database_1.default.query(\`
                SELECT address FROM geocoded_addresses
                WHERE ABS(lat - $1) < $3 AND ABS(lng - $2) < $3
                ORDER BY created_at DESC
                LIMIT 1
            \`, [lat, lng, delta]);`
);

if (fixed !== content) {
    fs.writeFileSync(path, fixed, 'utf8');
    console.log('OK: ST_DWithin cache lookup replaced with bounding-box');
} else {
    console.log('SKIP: regex did not match');
    // Show the relevant section
    const idx = content.indexOf('ST_DWithin');
    if (idx >= 0) console.log('Context:', JSON.stringify(content.slice(Math.max(0,idx-100), idx+300)));
}
