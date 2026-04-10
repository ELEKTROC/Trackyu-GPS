"""
patch_worker_and_acc.py
Fix 1: positionWorker.js — corrige let fuelLiters = fuelLiters et fuel_liters mal placé
Fix 2: jt808.js — extraire bit ACC du champ status → data.acc = true/false
        => positionWorker pourra marquer STOPPED au lieu de IDLE quand ACC=0
"""
import subprocess

WORKER_PATH = '/var/www/trackyu-gps/backend/dist/workers/positionWorker.js'
PARSER_PATH = '/var/www/trackyu-gps/backend/dist/gps-server/parsers/jt808.js'

def read(path):
    r = subprocess.run(['ssh', 'trackyu-vps', f'cat {path}'], capture_output=True, text=True)
    return r.stdout

def write(path, content):
    r = subprocess.run(['ssh', 'trackyu-vps', f'cat > {path}'], input=content, capture_output=True, text=True)
    return r.returncode == 0

def patch(content, old, new, label):
    if old not in content:
        print(f'  SKIP (not found): {label}')
        return content
    result = content.replace(old, new, 1)
    print(f'  OK: {label}')
    return result

# ═══════════════════════════════════════════════════════
# PATCH 1 — positionWorker.js
# ═══════════════════════════════════════════════════════
print('[1/2] Patching positionWorker.js...')
content = read(WORKER_PATH)

# Fix 1a: retirer fuel_liters mal injecté dans EcoDriving detectEvents
content = patch(content,
    '''                    heading: data.heading,
                fuel_liters: fuelLiters,
                    time: new Date(timestamp)
                }, {''',
    '''                    heading: data.heading,
                    time: new Date(timestamp)
                }, {''',
    'remove misplaced fuel_liters from EcoDriving call'
)

# Fix 1b: corriger let fuelLiters = fuelLiters → vraie initialisation
content = patch(content,
    '            let fuelLiters = fuelLiters;',
    '            let fuelLiters = data.fuel !== undefined ? data.fuel : null;',
    'fix fuelLiters self-reference'
)

if write(WORKER_PATH, content):
    print('  positionWorker.js written OK')
else:
    print('  ERROR writing positionWorker.js')

# ═══════════════════════════════════════════════════════
# PATCH 2 — jt808.js : extraire bit ACC du status
# ═══════════════════════════════════════════════════════
print('[2/2] Patching jt808.js — extract ACC bit...')
content = read(PARSER_PATH)

# Ajouter acc dans le return 0x0200
content = patch(content,
    '''            return {
                imei,
                latitude: finalLat,''',
    '''            // Status bit 0 = ACC ON (1) / OFF (0)
            const acc = (status & 0x01) !== 0;
            return {
                imei,
                acc,
                latitude: finalLat,''',
    'extract ACC bit from JT808 status'
)

if write(PARSER_PATH, content):
    print('  jt808.js written OK')
else:
    print('  ERROR writing jt808.js')

# Syntax checks
r = subprocess.run(['ssh', 'trackyu-vps',
    'docker run --rm -v /var/www/trackyu-gps/backend/dist:/app/dist '
    'node:18-alpine sh -c "'
    'node --check /app/dist/workers/positionWorker.js && '
    'node --check /app/dist/gps-server/parsers/jt808.js && echo SYNTAX_OK"'],
    capture_output=True, text=True)
print('Syntax check:', r.stdout.strip() or r.stderr.strip()[:200])

r2 = subprocess.run(['ssh', 'trackyu-vps', 'docker restart trackyu-gps-backend-1'],
    capture_output=True, text=True)
print('Restart:', r2.stdout.strip())
