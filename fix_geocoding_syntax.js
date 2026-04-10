const fs = require('fs');
const path = '/app/dist/services/ReverseGeocodingService.js';
let content = fs.readFileSync(path, 'utf8');

// Fix: single-quoted SQL with 'google' inside breaks JS string
// Replace with double-quoted string
const broken = `'INSERT INTO geocoded_addresses (lat, lng, address, provider) VALUES ($1, $2, $3, 'google') ON CONFLICT DO NOTHING'`;
const fixed  = `"INSERT INTO geocoded_addresses (lat, lng, address, provider) VALUES ($1, $2, $3, 'google') ON CONFLICT DO NOTHING"`;

if (content.includes(broken)) {
    content = content.replace(broken, fixed);
    fs.writeFileSync(path, content, 'utf8');
    console.log('OK: syntax fixed');
} else {
    console.log('SKIP: pattern not found, trying node --check first');
}
