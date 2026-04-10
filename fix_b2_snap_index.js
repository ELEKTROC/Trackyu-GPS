/**
 * B2 — Fix snap-to-road index merge using originalIndex
 * When Google Roads API interpolates, it returns more points than input.
 * The current code maps speed/heading/time by sequential index (wrong).
 * Fix: use snappedPoints[i].originalIndex to get the correct source point.
 * Also adds `ignition` to the snapped history response.
 */
const fs = require('fs');

// ── 1. GoogleMapsService.js — return originalIndex from snapToRoads ───────────
const gmPath = '/app/dist/services/GoogleMapsService.js';
let gm = fs.readFileSync(gmPath, 'utf8').replace(/\r\n/g, '\n');

const oldSnappedMap = `const points = response.data.snappedPoints.map((p) => ({
                            lat: p.location.latitude,
                            lng: p.location.longitude
                        }));`;
const newSnappedMap = `const points = response.data.snappedPoints.map((p) => ({
                            lat: p.location.latitude,
                            lng: p.location.longitude,
                            originalIndex: typeof p.originalIndex === 'number' ? p.originalIndex : null,
                        }));`;

if (gm.includes('originalIndex')) {
    console.log('SKIP GoogleMapsService: originalIndex already present');
} else if (gm.includes(oldSnappedMap)) {
    gm = gm.replace(oldSnappedMap, newSnappedMap);
    fs.writeFileSync(gmPath, gm, 'utf8');
    console.log('OK GoogleMapsService: originalIndex added to snapToRoads');
} else {
    // Try a more flexible match
    const flexOld = `lat: p.location.latitude,\n                            lng: p.location.longitude\n                        }));`;
    const flexNew = `lat: p.location.latitude,\n                            lng: p.location.longitude,\n                            originalIndex: typeof p.originalIndex === 'number' ? p.originalIndex : null,\n                        }));`;
    if (gm.includes(flexOld)) {
        gm = gm.replace(flexOld, flexNew);
        fs.writeFileSync(gmPath, gm, 'utf8');
        console.log('OK GoogleMapsService (flex): originalIndex added');
    } else {
        console.log('Context around snappedPoints:');
        const idx = gm.indexOf('snappedPoints');
        if (idx >= 0) console.log(JSON.stringify(gm.slice(idx, idx + 400)));
        console.log('FAIL GoogleMapsService: pattern not found');
        process.exit(1);
    }
}

// ── 2. objectController.js — fix merge in getObjectHistorySnapped ────────────
const ctrlPath = '/app/dist/controllers/objectController.js';
let ctrl = fs.readFileSync(ctrlPath, 'utf8').replace(/\r\n/g, '\n');

// Old merge (index-based, wrong for interpolated paths):
const oldMerge = `const result = snappedPath.map((point, i) => {
            var _a, _b, _c, _d, _e, _f;
            return (Object.assign(Object.assign({}, point), { speed: (_b = (_a = history[i]) === null || _a === void 0 ? void 0 : _a.speed) !== null && _b !== void 0 ? _b : 0, heading: (_d = (_c = history[i]) === null || _c === void 0 ? void 0 : _c.heading) !== null && _d !== void 0 ? _d : 0, time: (_f = (_e = history[i]) === null || _e === void 0 ? void 0 : _e.time) !== null && _f !== void 0 ? _f : null }));
        });`;

// New merge (originalIndex-aware, adds ignition):
const newMerge = `const result = snappedPath.map((point, i) => {
            // Use originalIndex from Google Roads API when available (interpolate=true inserts extra points)
            const srcIdx = (typeof point.originalIndex === 'number' && point.originalIndex >= 0 && point.originalIndex < history.length)
                ? point.originalIndex
                : Math.min(i, history.length - 1);
            const src = history[srcIdx] || {};
            return {
                lat:      point.lat,
                lng:      point.lng,
                speed:    src.speed   != null ? src.speed   : 0,
                heading:  src.heading != null ? src.heading : 0,
                time:     src.time    != null ? src.time    : null,
                ignition: src.ignition != null ? src.ignition : null,
            };
        });`;

if (ctrl.includes('originalIndex') && ctrl.includes('ignition: src.ignition')) {
    console.log('SKIP ctrl: snap merge already fixed');
} else if (ctrl.includes(oldMerge)) {
    ctrl = ctrl.replace(oldMerge, newMerge);
    fs.writeFileSync(ctrlPath, ctrl, 'utf8');
    console.log('OK ctrl: snap-to-road merge fixed (originalIndex + ignition)');
} else {
    // Try flexible match — the compiled output may vary slightly
    const flexIdx = ctrl.indexOf('snappedPath.map((point, i)');
    if (flexIdx >= 0) {
        const blockEnd = ctrl.indexOf('});', flexIdx);
        if (blockEnd >= 0) {
            const oldBlock = ctrl.slice(flexIdx - 'const result = '.length, blockEnd + 3);
            if (oldBlock.includes('history[i]')) {
                const fixed = ctrl.slice(0, flexIdx - 'const result = '.length) + newMerge + ctrl.slice(blockEnd + 3);
                fs.writeFileSync(ctrlPath, fixed, 'utf8');
                console.log('OK ctrl (flex): snap-to-road merge fixed');
            } else {
                console.log('Context:', JSON.stringify(oldBlock.slice(0, 300)));
                console.log('FAIL ctrl: block does not match expected pattern');
                process.exit(1);
            }
        }
    } else {
        console.log('FAIL ctrl: snappedPath.map not found');
        process.exit(1);
    }
}

console.log('\nDone. Restart backend to apply.');
