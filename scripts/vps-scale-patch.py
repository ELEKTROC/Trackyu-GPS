#!/usr/bin/env python3
"""
vps-scale-patch.py — Patch VPS pour architecture 10k devices / 1500 users
Applique les correctifs directement sur dist/ (source canonique VPS)

Usage :
    python3 scripts/vps-scale-patch.py [--dry-run] [--target /opt/trackyu/dist]

Options :
    --dry-run      Afficher les changements sans écrire
    --target PATH  Chemin vers dist/ sur le VPS (défaut: /opt/trackyu/dist)

Correctifs appliqués :
    1. Pool PostgreSQL : max 20 connexions (était: défaut 10 ou absent)
    2. Redis adapter Socket.IO : broadcasting multi-worker
    3. GPS buffer env vars : injection des nouvelles valeurs par défaut
    4. ulimit nofile hint dans le script de démarrage
"""

import re
import sys
import os
import json
import shutil
from datetime import datetime
from pathlib import Path

DRY_RUN = '--dry-run' in sys.argv
TARGET  = next((sys.argv[i+1] for i, a in enumerate(sys.argv) if a == '--target'), '/opt/trackyu/dist')

BACKUP_SUFFIX = f'.bak-{datetime.now().strftime("%Y%m%d-%H%M%S")}'

def log(msg):   print(f'[PATCH] {msg}')
def ok(msg):    print(f'\033[32m[OK]   {msg}\033[0m')
def warn(msg):  print(f'\033[33m[WARN] {msg}\033[0m')
def fail(msg):  print(f'\033[31m[FAIL] {msg}\033[0m')

def patch_file(path, patches):
    """Applique une liste de (search, replace, description) sur un fichier."""
    if not Path(path).exists():
        warn(f'Fichier non trouvé : {path}')
        return False

    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    applied = []

    for pattern, replacement, description in patches:
        new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)
        if new_content != content:
            content = new_content
            applied.append(description)
        else:
            warn(f'  Patch non appliqué (pattern non trouvé) : {description}')

    if content == original:
        log(f'Aucun changement : {path}')
        return False

    if not DRY_RUN:
        # Backup avant modification
        shutil.copy2(path, path + BACKUP_SUFFIX)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        ok(f'Patché : {path} ({len(applied)} corrections)')
    else:
        ok(f'[DRY-RUN] Serait patché : {path} ({len(applied)} corrections)')

    for a in applied:
        log(f'  ✓ {a}')

    return True

def find_server_js(dist_path):
    """Trouver le fichier server.js principal dans dist/."""
    candidates = [
        os.path.join(dist_path, 'server.js'),
        os.path.join(dist_path, 'index.js'),
        os.path.join(dist_path, 'app.js'),
    ]
    for c in candidates:
        if Path(c).exists():
            return c

    # Chercher récursivement le plus gros fichier .js (probablement le bundle)
    js_files = list(Path(dist_path).glob('*.js'))
    if js_files:
        return str(max(js_files, key=lambda f: f.stat().st_size))
    return None

# ─── PATCH 1 : Pool PostgreSQL ────────────────────────────────────────────────
def patch_db_pool(server_js):
    """Augmenter le pool DB à max 20 pour supporter 1500 users."""
    log('\n─── PATCH 1 : Pool PostgreSQL (max: 20) ───')

    patches = [
        # Pattern 1 : new Pool({ ... }) sans max
        (
            r'(new\s+Pool\s*\(\s*\{)([^}]*?)(connectionString[^}]*?\})',
            r'\1\2\3',  # On va ajouter max après
            'Pool sans max (skip — voir pattern 2)'
        ),
        # Pattern 2 : Pool avec host/user/password mais sans max
        (
            r'(new\s+Pool\s*\(\s*\{[^}]*?)(password\s*:[^,}]+)(,?\s*\})',
            r'\1\2,\n  max: parseInt(process.env.DB_POOL_MAX || "20"),\n  idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE || "10000"),\n  connectionTimeoutMillis: 5000\3',
            'Ajout max/idle au Pool pg'
        ),
        # Pattern 3 : Pool avec connectionString
        (
            r'(new\s+Pool\s*\(\s*\{[^}]*?)(connectionString\s*:[^,}]+)(,?\s*\})',
            r'\1\2,\n  max: parseInt(process.env.DB_POOL_MAX || "20"),\n  idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE || "10000"),\n  connectionTimeoutMillis: 5000\3',
            'Ajout max/idle au Pool pg (connectionString)'
        ),
        # Pattern 4 : Pool déjà avec max mais valeur trop faible
        (
            r'(new\s+Pool\s*\(\s*\{[^}]*?max\s*:\s*)(\d+)',
            lambda m: m.group(1) + str(max(20, int(m.group(2)))),
            'Augmentation max Pool si < 20'
        ),
    ]

    return patch_file(server_js, patches)

# ─── PATCH 2 : Redis adapter Socket.IO ───────────────────────────────────────
def patch_socket_io_redis(server_js):
    """Ajouter @socket.io/redis-adapter pour cluster multi-worker."""
    log('\n─── PATCH 2 : Socket.IO Redis Adapter ───')

    patches = [
        # Ajouter l'import redis-adapter après createServer ou io = new Server
        (
            r'(const\s+io\s*=\s*new\s+(?:Server|require\(["\']socket\.io["\']\)\s*\())',
            r"""// ─ Redis adapter (cluster multi-worker) ─
let _redisAdapter = null;
(async () => {
  try {
    const { createClient } = await import('redis');
    const { createAdapter } = await import('@socket.io/redis-adapter');
    const pubClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    const subClient = pubClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    console.info('[Socket.IO] Redis adapter activé — cluster broadcasting OK');
  } catch (e) {
    console.warn('[Socket.IO] Redis adapter non disponible (mode single-process):', e.message);
  }
})();
// ─────────────────────────────────────────
\1""",
            'Socket.IO Redis adapter (broadcast multi-worker)'
        ),
    ]

    return patch_file(server_js, patches)

# ─── PATCH 3 : GPS buffer env vars par défaut ─────────────────────────────────
def patch_gps_buffer(gps_server_js):
    """Mettre à jour les valeurs par défaut du buffer GPS."""
    log('\n─── PATCH 3 : GPS Buffer (BATCH=500, MAX=10000, FLUSH=500ms) ───')

    if not Path(gps_server_js).exists():
        warn(f'GPS server non trouvé : {gps_server_js}')
        return False

    patches = [
        (
            r"GPS_BUFFER_BATCH\s*\|\|\s*['\"]?\d+['\"]?",
            "GPS_BUFFER_BATCH || '500'",
            'BATCH_SIZE 100→500'
        ),
        (
            r"GPS_BUFFER_INTERVAL\s*\|\|\s*['\"]?\d+['\"]?",
            "GPS_BUFFER_INTERVAL || '500'",
            'FLUSH_INTERVAL 1000→500ms'
        ),
        (
            r"GPS_BUFFER_MAX\s*\|\|\s*['\"]?\d+['\"]?",
            "GPS_BUFFER_MAX || '10000'",
            'MAX_BUFFER 500→10000'
        ),
        (
            r"GPS_PARALLEL_FLUSH\s*\|\|\s*['\"]?\d+['\"]?",
            "GPS_PARALLEL_FLUSH || '4'",
            'PARALLEL_FLUSH 1→4'
        ),
    ]

    return patch_file(gps_server_js, patches)

# ─── PATCH 4 : noDelay + keepAlive sur TCP GPS ───────────────────────────────
def patch_tcp_options(gps_server_js):
    """Activer noDelay et keepAlive sur les sockets GPS TCP."""
    log('\n─── PATCH 4 : TCP noDelay + keepAlive ───')

    if not Path(gps_server_js).exists():
        warn(f'GPS server non trouvé : {gps_server_js}')
        return False

    patches = [
        # Ajouter après socket.setTimeout
        (
            r'(socket\.setTimeout\s*\([^;]+;)',
            r'\1\n    socket.setNoDelay(true);\n    socket.setKeepAlive(true, 30000);',
            'TCP setNoDelay + setKeepAlive'
        ),
    ]

    return patch_file(gps_server_js, patches)

# ─── PATCH 5 : Backlog TCP 4096 ──────────────────────────────────────────────
def patch_server_backlog(gps_server_js):
    """Augmenter le backlog TCP pour gérer les pics de reconnexion."""
    log('\n─── PATCH 5 : TCP backlog 4096 ───')

    if not Path(gps_server_js).exists():
        return False

    patches = [
        (
            r"server\.listen\s*\(\s*(\w+)\s*,\s*'0\.0\.0\.0'\s*,\s*\(",
            r"server.listen(\1, '0.0.0.0', 4096, (",
            'Backlog 4096'
        ),
        (
            r"server\.listen\s*\(\s*(\w+)\s*,\s*'0\.0\.0\.0'\s*,\s*function",
            r"server.listen(\1, '0.0.0.0', 4096, function",
            'Backlog 4096 (function)'
        ),
    ]

    return patch_file(gps_server_js, patches)

# ─── Script de démarrage optimisé ─────────────────────────────────────────────
def write_start_script(dist_path):
    """Créer un script start.sh avec les ulimits correctes."""
    log('\n─── Script de démarrage optimisé ───')
    script_path = os.path.join(os.path.dirname(dist_path), 'start.sh')

    content = '''#!/bin/bash
# start.sh — Démarrage TrackYu avec ulimits pour 10k devices / 1500 users
# Usage : bash start.sh [development|production]

ENV=${1:-production}

echo "[Start] Environnement : $ENV"

# Ulimits — permettre 15k+ fichiers ouverts (1 par connexion TCP/HTTP/WS)
ulimit -n 65536 2>/dev/null && echo "[Start] ulimit -n 65536 OK" || echo "[Start] ulimit non modifiable (nécessite root)"

# Variables de performance
export UV_THREADPOOL_SIZE=16         # Pool I/O Node.js (DB queries parallèles)
export NODE_OPTIONS="--max-old-space-size=1536 --max-semi-space-size=128"

# GPS Buffer (10k devices)
export GPS_BUFFER_BATCH=500
export GPS_BUFFER_MAX=10000
export GPS_BUFFER_INTERVAL=500
export GPS_PARALLEL_FLUSH=4
export GPS_RATE_LIMIT=10

# Socket.IO throttle
export THROTTLE_REALTIME=500
export THROTTLE_MOVING=1500
export THROTTLE_IDLE=4000
export THROTTLE_PARKED=10000

# DB Pool (20 connexions par worker)
export DB_POOL_MAX=20
export DB_POOL_IDLE=10000

# Redis
export REDIS_MAX_MEM=512mb

echo "[Start] Démarrage avec PM2..."
if command -v pm2 &>/dev/null; then
  pm2 start ecosystem.config.cjs --env $ENV
  pm2 save
else
  echo "[Start] PM2 non installé — démarrage direct"
  node dist/server.js &
  GPS_ONLY=true node dist/gps-server/server.js
fi
'''

    if not DRY_RUN:
        with open(script_path, 'w') as f:
            f.write(content)
        os.chmod(script_path, 0o755)
        ok(f'start.sh créé : {script_path}')
    else:
        ok(f'[DRY-RUN] start.sh serait créé : {script_path}')

# ─── PATCH 6 : package.json — ajouter @socket.io/redis-adapter ───────────────
def patch_package_json(dist_path):
    """Vérifier que @socket.io/redis-adapter est dans les dépendances."""
    log('\n─── PATCH 6 : @socket.io/redis-adapter dans package.json ───')

    pkg_path = os.path.join(os.path.dirname(dist_path), 'package.json')
    if not Path(pkg_path).exists():
        warn(f'package.json non trouvé : {pkg_path}')
        return False

    with open(pkg_path, 'r') as f:
        pkg = json.load(f)

    changed = False
    deps = pkg.setdefault('dependencies', {})

    if '@socket.io/redis-adapter' not in deps:
        deps['@socket.io/redis-adapter'] = '^8.3.0'
        changed = True
        log('  Ajout @socket.io/redis-adapter ^8.3.0')

    if changed and not DRY_RUN:
        with open(pkg_path, 'w') as f:
            json.dump(pkg, f, indent=2)
        ok(f'package.json mis à jour. Relancer : npm install --legacy-peer-deps')
        log('  ATTENTION : relancer npm install sur le VPS après ce patch')
    elif changed:
        ok(f'[DRY-RUN] package.json serait mis à jour')

    return changed

# ─── Main ─────────────────────────────────────────────────────────────────────
def main():
    print('\n' + '=' * 65)
    print('VPS Scale Patch — TrackYu 10k devices / 1500 users')
    print('=' * 65)
    print(f'Cible    : {TARGET}')
    print(f'Mode     : {"DRY-RUN (aucun fichier modifié)" if DRY_RUN else "LIVE (backups créés)"}')
    print('=' * 65 + '\n')

    if not Path(TARGET).exists():
        fail(f'Répertoire dist/ non trouvé : {TARGET}')
        fail('Utiliser --target /chemin/vers/dist ou s\'assurer d\'être sur le VPS')
        sys.exit(1)

    # Trouver les fichiers cibles
    server_js     = find_server_js(TARGET)
    gps_server_js = os.path.join(TARGET, 'gps-server', 'server.js')

    if not server_js:
        fail(f'server.js non trouvé dans {TARGET}')
        sys.exit(1)

    log(f'server.js trouvé : {server_js}')
    log(f'gps-server.js    : {gps_server_js}')

    # Appliquer les patches
    results = []
    results.append(patch_db_pool(server_js))
    results.append(patch_socket_io_redis(server_js))
    results.append(patch_gps_buffer(gps_server_js))
    results.append(patch_tcp_options(gps_server_js))
    results.append(patch_server_backlog(gps_server_js))
    results.append(patch_package_json(TARGET))
    write_start_script(TARGET)

    applied = sum(1 for r in results if r)
    total   = len(results)

    print('\n' + '=' * 65)
    log(f'Patches appliqués : {applied}/{total}')

    if not DRY_RUN and applied > 0:
        print('\nProchaines étapes sur le VPS :')
        print('  1. npm install --legacy-peer-deps  (pour @socket.io/redis-adapter)')
        print('  2. pm2 install pm2-logrotate')
        print('  3. bash start.sh production')
        print('  4. pm2 status')
        print('  5. pm2 logs --lines 50')
        print('\nSi PM2 non installé :')
        print('  npm install -g pm2')
        print('  pm2 startup systemd && pm2 save')

    print('=' * 65)

if __name__ == '__main__':
    main()
