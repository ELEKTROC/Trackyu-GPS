const fs = require('fs');
const path = '/app/dist/repositories/objectRepository.js';
let content = fs.readFileSync(path, 'utf8');

// Normalize to LF for matching, then write back with original line endings
const hasCRLF = content.includes('\r\n');
const normalized = content.replace(/\r\n/g, '\n');

const old = `            const t = tripsRes.rows[0];
            const drivingSeconds  = parseInt(t.driving_seconds) || 0;
            const stoppedSeconds  = parseInt(stoppedRes.rows[0].stopped_seconds) || 0;
            const idleSeconds     = parseInt(idleRes.rows[0].idle_seconds) || 0;
            const totalActive     = drivingSeconds + stoppedSeconds + idleSeconds;
            // Elapsed seconds since midnight (capped at 24h) — not a fixed 24h
            const elapsedSeconds = Math.min(
                Math.floor((Date.now() - new Date(startOfDay).getTime()) / 1000),
                24 * 3600
            );
            const offlineSeconds  = Math.max(0, elapsedSeconds - totalActive);`;

const newCode = `            const t = tripsRes.rows[0];
            const drivingSeconds  = parseInt(t.driving_seconds) || 0;
            let stoppedSeconds    = parseInt(stoppedRes.rows[0].stopped_seconds) || 0;
            let idleSeconds       = parseInt(idleRes.rows[0].idle_seconds) || 0;
            const totalActive     = drivingSeconds + stoppedSeconds + idleSeconds;
            // Elapsed seconds since midnight (capped at 24h)
            const elapsedSeconds = Math.min(
                Math.floor((Date.now() - new Date(startOfDay).getTime()) / 1000),
                24 * 3600
            );
            const gapSeconds = Math.max(0, elapsedSeconds - totalActive);
            // Allocate gap based on current vehicle status: STOPPED ≠ offline
            let offlineSeconds = 0;
            try {
                const statusRes = yield database_1.default.query(
                    "SELECT status FROM objects WHERE id = $1 LIMIT 1", [objectId]
                );
                const currentStatus = (statusRes.rows[0] && statusRes.rows[0].status) || 'OFFLINE';
                if (currentStatus === 'STOPPED') {
                    stoppedSeconds += gapSeconds;
                } else if (currentStatus === 'IDLE') {
                    idleSeconds += gapSeconds;
                } else if (currentStatus === 'MOVING') {
                    // gap unlikely during moving, ignore
                } else {
                    offlineSeconds = gapSeconds;
                }
            } catch (_) {
                offlineSeconds = gapSeconds;
            }`;

if (normalized.includes(old)) {
    let patched = normalized.replace(old, newCode);
    if (hasCRLF) patched = patched.replace(/\n/g, '\r\n');
    fs.writeFileSync(path, patched, 'utf8');
    console.log('OK: getDayStats status-aware gap allocation patched');
} else {
    console.log('SKIP: pattern not found');
    const idx = normalized.indexOf('const offlineSeconds  = Math.max');
    console.log('offlineSeconds line context:', JSON.stringify(normalized.slice(Math.max(0,idx-200), idx+100)));
}
