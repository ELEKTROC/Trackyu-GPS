#!/usr/bin/env python3
"""
Chantier 2 - TECH role fixes:
1. interventionController.js: pass technicianId from req.query to findAll
2. interventionRepository.js: filter by technician_id when provided
"""
import subprocess

SCRIPT = r"""
import sys, os

CONTROLLER = '/var/www/trackyu-gps/backend/dist/controllers/interventionController.js'
REPO = '/var/www/trackyu-gps/backend/dist/repositories/interventionRepository.js'

# ── Patch controller ──────────────────────────────────────────────────────────
c = open(CONTROLLER).read()
if 'TECHID_PATCHED' in c:
    print('Controller: already patched')
else:
    OLD = (
        'const getInterventions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {\n'
        '    var _a, _b;\n'
        '    try {\n'
        '        const interventions = yield interventionRepository_1.interventionRepository.findAll'
        '((_a = req.user) === null || _a === void 0 ? void 0 : _a.tenantId, '
        '(_b = req.user) === null || _b === void 0 ? void 0 : _b.clientId);\n'
        '        res.json(interventions);\n'
        '    }\n'
        '    catch (_c) {\n'
        '        res.status(500).json({ error: \'Internal server error\' });\n'
        '    }\n'
        '});'
    )
    NEW = (
        'const getInterventions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {\n'
        '    var _a, _b;\n'
        '    try {\n'
        '        const technicianId = req.query.technicianId || undefined;\n'
        '        const interventions = yield interventionRepository_1.interventionRepository.findAll'
        '((_a = req.user) === null || _a === void 0 ? void 0 : _a.tenantId, '
        '(_b = req.user) === null || _b === void 0 ? void 0 : _b.clientId, technicianId);\n'
        '        res.json(interventions);\n'
        '    }\n'
        '    catch (_c) {\n'
        '        res.status(500).json({ error: \'Internal server error\' });\n'
        '    }\n'
        '}); // TECHID_PATCHED'
    )
    if OLD in c:
        c = c.replace(OLD, NEW, 1)
        open(CONTROLLER, 'w').write(c)
        print('Controller: patched OK')
    else:
        print('Controller: OLD string not found - dumping context')
        idx = c.find('getInterventions = (req')
        print(repr(c[idx:idx+400]))

# ── Patch repository ──────────────────────────────────────────────────────────
r = open(REPO).read()
if 'TECHID_REPO_PATCHED' in r:
    print('Repository: already patched')
else:
    OLD_R = '    findAll(tenantId, clientId) {'
    NEW_R = '    findAll(tenantId, clientId, technicianId) { // TECHID_REPO_PATCHED'
    OLD_BLOCK = (
        '            if (clientId) {\n'
        '                conditions.push(`client_id = $${params.length + 1}`);\n'
        '                params.push(clientId);\n'
        '            }\n'
        '            if (conditions.length > 0) {'
    )
    NEW_BLOCK = (
        '            if (clientId) {\n'
        '                conditions.push(`client_id = $${params.length + 1}`);\n'
        '                params.push(clientId);\n'
        '            }\n'
        '            if (technicianId) {\n'
        '                conditions.push(`technician_id = $${params.length + 1}`);\n'
        '                params.push(technicianId);\n'
        '            }\n'
        '            if (conditions.length > 0) {'
    )
    if OLD_R in r and OLD_BLOCK in r:
        r = r.replace(OLD_R, NEW_R, 1)
        r = r.replace(OLD_BLOCK, NEW_BLOCK, 1)
        open(REPO, 'w').write(r)
        print('Repository: patched OK')
    else:
        found_sig = OLD_R in r
        found_block = OLD_BLOCK in r
        print(f'Repository: sig={found_sig} block={found_block}')
        if not found_block:
            idx = r.find('if (clientId)')
            print(repr(r[idx:idx+200]))
"""

# Write script to VPS and run it
REMOTE_SCRIPT = '/tmp/patch_tech.py'
write_cmd = ["ssh", "trackyu-vps",
             f"python3 -c \"import sys; open('{REMOTE_SCRIPT}', 'w').write(sys.stdin.read())\""]
result = subprocess.run(write_cmd, input=SCRIPT, text=True, capture_output=True, encoding='utf-8')
if result.returncode != 0:
    print("Write error:", result.stderr)
    exit(1)

run_cmd = ["ssh", "trackyu-vps", f"python3 {REMOTE_SCRIPT}"]
result = subprocess.run(run_cmd, capture_output=True, text=True, encoding='utf-8')
print(result.stdout.strip())
if result.stderr:
    print("STDERR:", result.stderr.strip())

if result.returncode != 0:
    print("Patch failed")
    exit(1)

# Copy patched files into Docker container and restart
print("\nCopying to container...")
CONTROLLER = "/var/www/trackyu-gps/backend/dist/controllers/interventionController.js"
REPO = "/var/www/trackyu-gps/backend/dist/repositories/interventionRepository.js"

for src, dest in [
    (CONTROLLER, "trackyu-gps-backend-1:/app/dist/controllers/interventionController.js"),
    (REPO, "trackyu-gps-backend-1:/app/dist/repositories/interventionRepository.js"),
]:
    r = subprocess.run(["ssh", "trackyu-vps", f"docker cp {src} {dest}"],
                       capture_output=True, text=True)
    label = src.split('/')[-1]
    print(f"  {label}: {'OK' if r.returncode == 0 else 'FAIL - ' + r.stderr.strip()}")

r = subprocess.run(["ssh", "trackyu-vps", "docker restart trackyu-gps-backend-1"],
                   capture_output=True, text=True)
print(f"  restart: {'OK' if r.returncode == 0 else 'FAIL'}")

import time; time.sleep(4)
r = subprocess.run(["ssh", "trackyu-vps",
                    "docker ps --format '{{.Names}}\t{{.Status}}' | grep backend"],
                   capture_output=True, text=True)
print(f"Container: {r.stdout.strip()}")
