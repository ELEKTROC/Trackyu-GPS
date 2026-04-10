"""
patch_fuel_factor.py
Applique le facteur de conversion carburant dans positionWorker.js.
Si calibration_table = {"factor": 2.5}, alors fuel_liters = raw_fuel * 2.5
"""
import subprocess

PATH = '/var/www/trackyu-gps/backend/dist/workers/positionWorker.js'

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

content = read(PATH)

# 1. Calcul de fuelLiters avec facteur de conversion, juste avant "// 3. Update Cache"
content = patch(content,
    '            // 3. Update Cache & DB\n            yield cacheService_1.CacheService.setLastPosition(vehicle.id, {',
    '''            // Fuel conversion factor (calibration_table: {"factor": N})
            let fuelLiters = data.fuel !== undefined ? data.fuel : null;
            if (fuelLiters !== null && vehicle.calibration_table) {
                try {
                    const cal = typeof vehicle.calibration_table === 'string'
                        ? JSON.parse(vehicle.calibration_table)
                        : vehicle.calibration_table;
                    if (cal && typeof cal.factor === 'number' && cal.factor > 0) {
                        fuelLiters = Math.round(fuelLiters * cal.factor * 10) / 10;
                    }
                } catch(e) { /* calibration_table format invalide, ignorer */ }
            }
            // 3. Update Cache & DB
            yield cacheService_1.CacheService.setLastPosition(vehicle.id, {''',
    'add fuel conversion factor logic'
)

# 2. Remplacer data.fuel !== undefined ? data.fuel : null par fuelLiters dans les 4 endroits
old_expr = 'data.fuel !== undefined ? data.fuel : null'
new_expr = 'fuelLiters'
count = content.count(old_expr)
content = content.replace(old_expr, new_expr)
print(f'  OK: replaced {count} occurrences of fuel expression with fuelLiters')

if write(PATH, content):
    print('  positionWorker.js written OK')
else:
    print('  ERROR writing positionWorker.js')

# Syntax check
r = subprocess.run(['ssh', 'trackyu-vps',
    'docker run --rm -v /var/www/trackyu-gps/backend/dist:/app/dist '
    'node:18-alpine node --check /app/dist/workers/positionWorker.js && echo SYNTAX_OK'],
    capture_output=True, text=True)
print('Syntax check:', r.stdout.strip() or r.stderr.strip()[:200])

r2 = subprocess.run(['ssh', 'trackyu-vps', 'docker restart trackyu-gps-backend-1'],
    capture_output=True, text=True)
print('Restart:', r2.stdout.strip())
