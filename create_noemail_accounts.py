"""
create_noemail_accounts.py
Crée des comptes pour les clients sans email.
Email généré : {initiale+nom}@trackyugps.com
Mot de passe : Trackyu2025! + require_password_change = true
"""
import subprocess, json, unicodedata, re, time

PSQL = ["docker", "exec", "6e9a3283ca3b_trackyu-gps-postgres-1",
        "psql", "-U", "fleet_user", "-d", "fleet_db", "-t", "-A", "-c"]
API = "http://localhost:3001"

def slugify(s):
    s = unicodedata.normalize('NFD', s)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9]', '', s.lower())

def generate_email(name, used_emails):
    words = name.strip().split()
    base = slugify(words[0][0] + words[-1]) if len(words) >= 2 else slugify(words[0])
    candidate = base + '@trackyugps.com'
    suffix = 0
    while True:
        chk = subprocess.run(PSQL + [f"SELECT id FROM users WHERE email = '{candidate}';"],
                             capture_output=True, text=True)
        if chk.stdout.strip() == '' and candidate not in used_emails:
            return candidate
        suffix += 1
        candidate = f"{base}{suffix}@trackyugps.com"

query = (
    "SELECT t.id, t.name, t.tenant_id, COUNT(v.id) AS nb "
    "FROM tiers t JOIN vehicles v ON v.client_id = t.id "
    "WHERE t.type = 'CLIENT' AND (t.email IS NULL OR t.email = '') "
    "AND NOT EXISTS (SELECT 1 FROM users u WHERE u.client_id = t.id AND u.deleted_at IS NULL) "
    "GROUP BY t.id, t.name, t.tenant_id HAVING COUNT(v.id) >= 1 ORDER BY nb DESC;"
)
result = subprocess.run(PSQL + [query], capture_output=True, text=True)
clients = []
for line in result.stdout.strip().split("\n"):
    parts = line.split("|")
    if len(parts) == 4:
        clients.append({"id": parts[0].strip(), "name": parts[1].strip(),
                        "tenantId": parts[2].strip(), "nb": parts[3].strip()})

print(f"Clients sans email : {len(clients)}")

login_res = subprocess.run(
    ["curl", "-s", "-X", "POST", f"{API}/api/auth/login",
     "-H", "Content-Type: application/json",
     "-d", '{"email":"dg@trackyugps.com","password":"TrackYu2026!"}'],
    capture_output=True, text=True)
token = json.loads(login_res.stdout).get("token")
print(f"Token: {'OK' if token else 'FAIL'}")

ok, errors = [], []
used_emails = set()

for i, c in enumerate(clients):
    email = generate_email(c["name"], used_emails)
    used_emails.add(email)

    payload = {
        "email": email,
        "name": c["name"],
        "role": "CLIENT",
        "tenantId": c["tenantId"],
        "clientId": c["id"],
        "sendInvite": True,
        "permissions": ["VIEW_DASHBOARD", "VIEW_MAP", "VIEW_FLEET", "VIEW_REPORTS", "VIEW_ALERTS"],
        "allVehicles": True
    }

    res = subprocess.run(
        ["curl", "-s", "-X", "POST", f"{API}/api/users",
         "-H", "Content-Type: application/json",
         "-H", f"Authorization: Bearer {token}",
         "-d", json.dumps(payload)],
        capture_output=True, text=True)

    try:
        data = json.loads(res.stdout)
    except Exception:
        errors.append({"id": c["id"], "error": res.stdout[:80]})
        print(f"  [{i+1}/{len(clients)}] ERR {c['id']} parse error")
        continue

    if data.get("id"):
        ok.append({"id": c["id"], "name": c["name"],
                   "email_genere": email, "user_id": data["id"], "nb_vehicules": c["nb"]})
        print(f"  [{i+1}/{len(clients)}] OK {c['id']} ({c['nb']} veh) — {c['name']} → {email}")
    else:
        msg = data.get("message") or data.get("error") or str(data)[:80]
        errors.append({"id": c["id"], "name": c["name"], "error": msg})
        print(f"  [{i+1}/{len(clients)}] ERR {c['id']} — {msg}")

    time.sleep(0.05)

print(f"\nRESULTAT : {len(ok)} créés | {len(errors)} erreurs")
if errors:
    print("\nERREURS :")
    for e in errors:
        print(f"  {e['id']} — {e.get('name', '')} : {e['error']}")

print("\nEmails générés (à communiquer manuellement) :")
print(f"{'ID':<15} {'Nom':<30} {'Email généré':<35} {'Pass'}")
print("-" * 95)
for o in ok:
    print(f"  {o['id']:<15} {o['name']:<30} {o['email_genere']:<35} Trackyu2025!")

with open("/tmp/create_noemail_report.json", "w", encoding="utf-8") as f:
    json.dump({"created": ok, "errors": errors}, f, indent=2, ensure_ascii=False)
print("\nRapport : /tmp/create_noemail_report.json")
