"""Restore server.js GPS — retire les lignes corrompues par le patch sed"""
import subprocess, re

PATH = '/var/www/trackyu-gps/backend/dist/gps-server/server.js'

# Lire le fichier
r = subprocess.run(['ssh', 'trackyu-vps', f'cat {PATH}'], capture_output=True, text=True)
content = r.stdout

# Remplacer les deux blocs corrompus par la version originale propre
# Bloc 1 : dans la boucle de détection (entre socketProtocolMap et la boucle for)
corrupted = (
    "if (!usedParser) { logger_1.default.warn(`[GPS] UNKNOWN PROTOCOL from ${remoteIp} "
    "— raw: ${data.toString(\"hex\").slice(0,80)} | ascii: ${data.toString(\"ascii\").slice(0,80).replace(/"
)

# On cherche les deux occurrences et on les remplace par le bloc original
# La version originale avait simplement: if (!usedParser) {
# On reconstruit le bloc correct avec un log simple sur une seule ligne
fixed_log = (
    "if (!usedParser) { "
    "logger_1.default.warn('[GPS-RAW] Unknown protocol from ' + remoteIp + ' | hex=' + "
    "data.toString('hex').slice(0, 80) + ' | ascii=' + "
    "data.toString('ascii').replace(/[\\x00-\\x1f]/g, '.').slice(0, 80)); "
)

# Trouver et remplacer chaque occurrence corrompue
# Le texte corrompu continue jusqu'au `;` final sur la même ligne
lines = content.split('\n')
new_lines = []
i = 0
fixed_count = 0
while i < len(lines):
    line = lines[i]
    if 'if (!usedParser) { logger_1.default.warn' in line and 'UNKNOWN PROTOCOL' in line:
        # Reconstruire l'indentation
        indent = len(line) - len(line.lstrip())
        spaces = ' ' * indent
        new_lines.append(spaces + fixed_log)
        fixed_count += 1
    else:
        new_lines.append(line)
    i += 1

print(f"Occurrences corrigées: {fixed_count}")
new_content = '\n'.join(new_lines)

# Écrire via stdin
r2 = subprocess.run(
    ['ssh', 'trackyu-vps', f'cat > {PATH}'],
    input=new_content,
    capture_output=True, text=True
)
if r2.returncode != 0:
    print("ERR:", r2.stderr)
else:
    print("Fichier restauré OK")

# Redémarrer
r3 = subprocess.run(['ssh', 'trackyu-vps', 'docker restart trackyu-gps-backend-1'],
                    capture_output=True, text=True)
print("Restart:", r3.stdout.strip())
