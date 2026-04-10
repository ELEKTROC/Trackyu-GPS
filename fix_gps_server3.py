"""Restore correcte des deux blocs if (!usedParser) dans server.js"""
import subprocess

PATH = '/var/www/trackyu-gps/backend/dist/gps-server/server.js'

r = subprocess.run(['ssh', 'trackyu-vps', f'cat {PATH}'], capture_output=True, text=True)
lines = r.stdout.split('\n')

LOG_LINE = ("logger_1.default.warn('[GPS-RAW] Unknown protocol from ' + remoteIp + "
            "' | hex=' + data.toString('hex').slice(0, 80) + ' | ascii=' + "
            "data.toString('ascii').replace(/[\\x00-\\x1f]/g, '.').slice(0, 80)); ")

occurrence = 0
new_lines = []
for line in lines:
    if LOG_LINE[:30] in line and 'if (!usedParser)' in line:
        occurrence += 1
        indent = len(line) - len(line.lstrip())
        spaces = ' ' * indent
        if occurrence == 1:
            # Premiere occurrence : juste ouvrir le bloc (boucle de detection)
            new_lines.append(spaces + 'if (!usedParser) {')
            print(f"  Occurrence 1 -> if (!usedParser) {{  (boucle)")
        else:
            # Deuxieme occurrence : garder le log + ouvrir bloc
            new_lines.append(spaces + 'if (!usedParser) {')
            new_lines.append(spaces + '    ' + LOG_LINE.strip())
            print(f"  Occurrence 2 -> if (!usedParser) + log")
    else:
        new_lines.append(line)

print(f"Total occurrences traitees: {occurrence}")

new_content = '\n'.join(new_lines)
r2 = subprocess.run(['ssh', 'trackyu-vps', f'cat > {PATH}'],
                    input=new_content, capture_output=True, text=True)
print("Ecriture:", "OK" if r2.returncode == 0 else r2.stderr)

# Verifier syntaxe Node
r4 = subprocess.run(['ssh', 'trackyu-vps',
                     'docker run --rm -v /var/www/trackyu-gps/backend/dist:/app/dist '
                     'node:18-alpine node --check /app/dist/gps-server/server.js 2>&1'],
                    capture_output=True, text=True)
syntax = r4.stdout.strip()
print("Syntax check:", syntax if syntax else "OK - no errors")

r5 = subprocess.run(['ssh', 'trackyu-vps', 'docker restart trackyu-gps-backend-1'],
                    capture_output=True, text=True)
print("Restart:", r5.stdout.strip())
