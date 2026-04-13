# -*- coding: utf-8 -*-
#!/usr/bin/env python3
"""
Patch ruleEvaluationService.js
- INSERT INTO alerts ... -> RETURNING id
- Stocker alertId et UPDATE alerts SET {col}=true apres dispatch
"""
import subprocess, sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

PATH = '/var/www/trackyu-gps/backend/dist/services/ruleEvaluationService.js'

# Lire le fichier en bytes puis decoder en UTF-8
print("Lecture du fichier...")
r = subprocess.run(['ssh', 'trackyu-vps', f'cat {PATH}'],
                   capture_output=True, timeout=30)
content = r.stdout.decode('utf-8')
print(f"Taille: {len(content)} chars")

def patch(name, old, new, content, required=True):
    if old not in content:
        print(f"AVERTISSEMENT [{name}]: pattern non trouve")
        if required:
            # Afficher un contexte debug
            anchor = old[:40]
            idx = content.find(anchor)
            if idx > -1:
                print(f"  Anchor '{anchor}' trouve a {idx}:")
                print(f"  Contexte: {repr(content[idx:idx+120])}")
        return content
    content = content.replace(old, new, 1)
    print(f"OK [{name}]")
    return content

# ── PATCH 1 : INSERT RETURNING id ─────────────────────────────────────────────
content = patch(
    "INSERT RETURNING id",
    (
        "INSERT INTO alerts (object_id, type, severity, message, latitude, longitude, created_at, rule_id)\n"
        "                VALUES ($1, $2, $3, $4, NULL, NULL, NOW(), $5)\n"
        "            `"
    ),
    (
        "INSERT INTO alerts (object_id, type, severity, message, latitude, longitude, created_at, rule_id)\n"
        "                VALUES ($1, $2, $3, $4, NULL, NULL, NOW(), $5)\n"
        "                RETURNING id\n"
        "            `"
    ),
    content
)

# ── PATCH 2 : const result = yield query(...) ─────────────────────────────────
content = patch(
    "const result = yield query",
    (
        "yield database_1.default.query(`\n"
        "                INSERT INTO alerts (object_id, type, severity, message, latitude, longitude, created_at, rule_id)\n"
        "                VALUES ($1, $2, $3, $4, NULL, NULL, NOW(), $5)\n"
        "                RETURNING id\n"
        "            `"
    ),
    (
        "const result = yield database_1.default.query(`\n"
        "                INSERT INTO alerts (object_id, type, severity, message, latitude, longitude, created_at, rule_id)\n"
        "                VALUES ($1, $2, $3, $4, NULL, NULL, NOW(), $5)\n"
        "                RETURNING id\n"
        "            `"
    ),
    content
)

# ── PATCH 3 : Extraire _alertId apres l'INSERT ────────────────────────────────
# Anchor sur "// 2. Emettre alerte en temps reel"
content = patch(
    "extract _alertId",
    "                // 2. \u00c9mettre alerte en temps r\u00e9el\n"
    "                socketThrottle_1.socketThrottle.emitAlert(",
    "                const _alertId = result && result.rows && result.rows[0] ? result.rows[0].id : null;\n"
    "                // 2. \u00c9mettre alerte en temps r\u00e9el\n"
    "                socketThrottle_1.socketThrottle.emitAlert(",
    content
)

# ── PATCH 4 : UPDATE push_sent apres dispatch PUSH ───────────────────────────
content = patch(
    "UPDATE push_sent",
    "}).catch(e => logger_1.default.error('[Push] Failed for user ' + userRow.user_id + ': ' + e.message));\n"
    "                    }\n"
    "                    if (prefs.emailAlerts && userRow.email)",
    "}).then(r => { if (_alertId && r && r.success) database_1.default.query('UPDATE alerts SET push_sent=TRUE WHERE id=$1', [_alertId]).catch(()=>{}); })\n"
    "                      .catch(e => logger_1.default.error('[Push] Failed for user ' + userRow.user_id + ': ' + e.message));\n"
    "                    }\n"
    "                    if (prefs.emailAlerts && userRow.email)",
    content
)

# ── PATCH 5 : UPDATE email_sent apres dispatch EMAIL ─────────────────────────
content = patch(
    "UPDATE email_sent",
    "}).catch(e => logger_1.default.error('[Email] Failed for user ' + userRow.user_id + ': ' + e.message));\n"
    "                    }\n"
    "                    if (prefs.smsAlerts && userRow.phone)",
    "}).then(r => { if (_alertId && r && r.success) database_1.default.query('UPDATE alerts SET email_sent=TRUE WHERE id=$1', [_alertId]).catch(()=>{}); })\n"
    "                      .catch(e => logger_1.default.error('[Email] Failed for user ' + userRow.user_id + ': ' + e.message));\n"
    "                    }\n"
    "                    if (prefs.smsAlerts && userRow.phone)",
    content
)

# ── PATCH 6 : UPDATE sms_sent apres dispatch SMS ─────────────────────────────
content = patch(
    "UPDATE sms_sent",
    "}).catch(e => logger_1.default.error('[SMS] Failed for user ' + userRow.user_id + ': ' + e.message));\n"
    "                    }\n"
    "                }",
    "}).then(r => { if (_alertId && r && r.success) database_1.default.query('UPDATE alerts SET sms_sent=TRUE WHERE id=$1', [_alertId]).catch(()=>{}); })\n"
    "                      .catch(e => logger_1.default.error('[SMS] Failed for user ' + userRow.user_id + ': ' + e.message));\n"
    "                    }\n"
    "                }",
    content
)

# ── Ecrire sur le VPS ─────────────────────────────────────────────────────────
print("\nEcriture sur VPS...")
r2 = subprocess.run(
    ['ssh', 'trackyu-vps', f'cat > {PATH}'],
    input=content.encode('utf-8'),
    capture_output=True, timeout=30
)
if r2.returncode != 0:
    print("ERR ecriture:", r2.stderr.decode('utf-8', errors='replace'))
    sys.exit(1)
print("Fichier ecrit OK")

# Verifier les patches appliques
print("\nVerification...")
r3 = subprocess.run(['ssh', 'trackyu-vps', f'grep -n "RETURNING id\\|_alertId\\|push_sent\\|email_sent\\|sms_sent" {PATH}'],
                    capture_output=True, timeout=15)
print(r3.stdout.decode('utf-8', errors='replace'))

# Redemarrer
print("Redemarrage backend...")
r4 = subprocess.run(
    ['ssh', 'trackyu-vps', 'docker restart trackyu-gps-backend-1'],
    capture_output=True, text=True, timeout=60
)
print("Restart:", r4.stdout.strip())
print("\nPatch termine.")
