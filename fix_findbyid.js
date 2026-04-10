const fs = require('fs');
const path = '/app/dist/repositories/objectRepository.js';
let content = fs.readFileSync(path, 'utf8');

// Find the findByIdWithJoins function and locate the query
const marker = 'findByIdWithJoins(id, tenantId, clientId)';
const idx = content.indexOf(marker);
if (idx < 0) { console.log('MARKER NOT FOUND'); process.exit(1); }

// Find the backtick query block
const qStart = content.indexOf('let query = `', idx);
const qEnd = content.indexOf('`;', qStart) + 2;
const orig = content.slice(qStart, qEnd);
console.log('Original query:');
console.log(orig);
console.log('---');

const newQuery = `let query = \`
      SELECT o.*,
             t.name as client_name,
             g.name as group_name,
             lp.latitude as location_lat,
             lp.longitude as location_lng,
             lp.time as last_updated,
             COALESCE(o.address, lp.address) as address
      FROM objects o
      LEFT JOIN tiers t ON o.client_id = t.id AND t.type = 'CLIENT'
      LEFT JOIN groups g ON o.group_id = g.id
      LEFT JOIN LATERAL (
        SELECT latitude, longitude, time, address
        FROM positions
        WHERE object_id = o.id
        ORDER BY time DESC
        LIMIT 1
      ) lp ON true
      WHERE o.id = $1
    \``;

content = content.slice(0, qStart) + newQuery + content.slice(qEnd);
fs.writeFileSync(path, content, 'utf8');
console.log('OK: findByIdWithJoins patched');
