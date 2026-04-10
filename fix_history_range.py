# -*- coding: utf-8 -*-
"""
1. objectRepository.js: support startTime/endTime in getPositionHistory
2. objectController.js: pass startTime/endTime from query params to getPositionHistory
"""

# ── 1. objectRepository.js ────────────────────────────────────────────────────

repo_path = '/var/www/trackyu-gps/backend/dist/repositories/objectRepository.js'
content = open(repo_path).read()

OLD_REPO = (
    "    getPositionHistory(objectId, date) {\n"
    "        return __awaiter(this, void 0, void 0, function* () {\n"
    "            const result = yield database_1.default.query(`\n"
    "      SELECT latitude as lat, longitude as lng, time, speed, heading,\n"
    "             CASE WHEN raw_data IS NOT NULL THEN (raw_data::jsonb->>'acc')::boolean ELSE NULL END as ignition\n"
    "      FROM positions WHERE object_id = $1 AND time::date = $2::date ORDER BY time ASC\n"
    "    `, [objectId, date || new Date().toISOString()]);"
)

NEW_REPO = (
    "    getPositionHistory(objectId, date, startTime, endTime) {\n"
    "        return __awaiter(this, void 0, void 0, function* () {\n"
    "            let result;\n"
    "            if (startTime && endTime) {\n"
    "                result = yield database_1.default.query(`SELECT latitude as lat, longitude as lng, time, speed, heading, CASE WHEN raw_data IS NOT NULL THEN (raw_data::jsonb->>'acc')::boolean ELSE NULL END as ignition FROM positions WHERE object_id = $1 AND time >= $2 AND time <= $3 ORDER BY time ASC`, [objectId, startTime, endTime]);\n"
    "            } else {\n"
    "                result = yield database_1.default.query(`SELECT latitude as lat, longitude as lng, time, speed, heading, CASE WHEN raw_data IS NOT NULL THEN (raw_data::jsonb->>'acc')::boolean ELSE NULL END as ignition FROM positions WHERE object_id = $1 AND time::date = $2::date ORDER BY time ASC`, [objectId, date || new Date().toISOString()]);\n"
    "            }"
)

if OLD_REPO in content:
    content = content.replace(OLD_REPO, NEW_REPO, 1)
    open(repo_path, 'w').write(content)
    print('OK: objectRepository.js patched')
else:
    print('ERROR: OLD_REPO not found in objectRepository.js')
    idx = content.find('getPositionHistory')
    print('getPositionHistory found at:', idx)
    if idx >= 0:
        print(repr(content[idx:idx+300]))

# ── 2. objectController.js: pass startTime/endTime ───────────────────────────

ctrl_path = '/var/www/trackyu-gps/backend/dist/controllers/objectController.js'
content = open(ctrl_path).read()

OLD_CTRL = "    const { date } = req.query;\n    const tenantId = ((_a = req.user)"
NEW_CTRL = "    const { date, startTime, endTime } = req.query;\n    const tenantId = ((_a = req.user)"

if OLD_CTRL in content:
    content = content.replace(OLD_CTRL, NEW_CTRL, 1)
    # Also update the call to getPositionHistory
    OLD_CALL = "const history = yield objectRepository_1.objectRepository.getPositionHistory(id, date);"
    NEW_CALL = "const history = yield objectRepository_1.objectRepository.getPositionHistory(id, date, startTime, endTime);"
    if OLD_CALL in content:
        content = content.replace(OLD_CALL, NEW_CALL, 1)
        print('OK: objectController.js patched (query + call)')
    else:
        print('WARNING: getPositionHistory call not found, only query params patched')
    open(ctrl_path, 'w').write(content)
else:
    print('ERROR: OLD_CTRL not found in objectController.js')
