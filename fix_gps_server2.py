"""Retire le fragment orphelin /g,"\n")`); dans server.js"""
import subprocess

PATH = '/var/www/trackyu-gps/backend/dist/gps-server/server.js'

r = subprocess.run(['ssh', 'trackyu-vps', f'cat {PATH}'], capture_output=True, text=True)
content = r.stdout

lines = content.split('\n')
new_lines = []
removed = 0
for line in lines:
    # Supprimer les lignes orphelines issues de la corruption
    if line.strip() in ['/g,"\\n")`);', r'/g,"\n")`);', '`);', '/g,`);']:
        removed += 1
        continue
    # Supprimer aussi les lignes qui ne contiennent que ce fragment
    stripped = line.strip()
    if stripped.startswith('/g,') and '`);' in stripped and len(stripped) < 20:
        removed += 1
        continue
    new_lines.append(line)

print(f"Lignes orphelines supprimées: {removed}")

new_content = '\n'.join(new_lines)

r2 = subprocess.run(
    ['ssh', 'trackyu-vps', f'cat > {PATH}'],
    input=new_content, capture_output=True, text=True
)
print("Écriture:", "OK" if r2.returncode == 0 else r2.stderr)

# Vérifier la ligne 129
r3 = subprocess.run(['ssh', 'trackyu-vps', f'sed -n "127,133p" {PATH}'],
                    capture_output=True, text=True)
print("Contenu lignes 127-133:")
print(r3.stdout)

r4 = subprocess.run(['ssh', 'trackyu-vps', 'docker restart trackyu-gps-backend-1'],
                    capture_output=True, text=True)
print("Restart:", r4.stdout.strip())
