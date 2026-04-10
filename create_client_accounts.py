"""
create_client_accounts.py
Crée un compte utilisateur CLIENT pour chaque tier qui :
  - a au moins 1 véhicule
  - a une adresse email
  - n'a pas encore de compte (client_id lié)

Mot de passe par défaut : Trackyu2025! (require_password_change = true)
En cas de doublon d'email entre deux tiers, le premier traité (nb_vehicules DESC) gagne.
"""

import subprocess, json, sys, time

PSQL = ["docker", "exec", "6e9a3283ca3b_trackyu-gps-postgres-1",
        "psql", "-U", "fleet_user", "-d", "fleet_db", "-t", "-A", "-c"]

API = "http://localhost:3001"

# ─── 1. Récupérer la liste des clients éligibles ─────────────────────────────
query = """
SELECT t.id, t.name, t.email, t.tenant_id
FROM tiers t
JOIN vehicles v ON v.client_id = t.id
WHERE t.type = 'CLIENT'
  AND t.email IS NOT NULL AND t.email != ''
GROUP BY t.id, t.name, t.email, t.tenant_id
HAVING COUNT(v.id) >= 1
  AND NOT EXISTS (SELECT 1 FROM users u WHERE u.client_id = t.id AND u.deleted_at IS NULL)
ORDER BY t.tenant_id, COUNT(v.id) DESC;
"""

result = subprocess.run(PSQL + [query], capture_output=True, text=True)
if result.returncode != 0:
    print("ERREUR DB:", result.stderr); sys.exit(1)

clients = []
for line in result.stdout.strip().split("\n"):
    if not line.strip():
        continue
    parts = line.split("|")
    if len(parts) == 4:
        clients.append({
            "id": parts[0].strip(),
            "name": parts[1].strip(),
            "email": parts[2].strip(),
            "tenantId": parts[3].strip()
        })

print(f"Clients éligibles : {len(clients)}")

# ─── 2. Login admin ───────────────────────────────────────────────────────────
login_result = subprocess.run(
    ["curl", "-s", "-X", "POST", f"{API}/api/auth/login",
     "-H", "Content-Type: application/json",
     "-d", '{"email":"dg@trackyugps.com","password":"TrackYu2026!"}'],
    capture_output=True, text=True
)
token_data = json.loads(login_result.stdout)
token = token_data.get("token")
if not token:
    print("ERREUR : login admin échoué"); sys.exit(1)
print("Admin connecté ✓")

# ─── 3. Créer les comptes ─────────────────────────────────────────────────────
ok = []
skipped = []
errors = []
seen_emails = set()

for i, c in enumerate(clients):
    email = c["email"].lower().strip()

    # Doublon d'email entre tiers — skip le second
    if email in seen_emails:
        skipped.append({"id": c["id"], "name": c["name"], "reason": f"email doublon ({email})"})
        print(f"  [{i+1}/{len(clients)}] SKIP {c['id']} — email doublon: {email}")
        continue
    seen_emails.add(email)

    payload = {
        "email": email,
        "name": c["name"],
        "role": "CLIENT",
        "tenantId": c["tenantId"],
        "clientId": c["id"],
        "permissions": ["VIEW_DASHBOARD", "VIEW_MAP", "VIEW_FLEET", "VIEW_REPORTS", "VIEW_ALERTS"],
        "vehicleIds": [],
        "allVehicles": True,
    }

    res = subprocess.run(
        ["curl", "-s", "-X", "POST", f"{API}/api/users",
         "-H", "Content-Type: application/json",
         "-H", f"Authorization: Bearer {token}",
         "-d", json.dumps(payload)],
        capture_output=True, text=True
    )

    try:
        data = json.loads(res.stdout)
    except Exception:
        errors.append({"id": c["id"], "name": c["name"], "error": res.stdout[:100]})
        print(f"  [{i+1}/{len(clients)}] ERREUR {c['id']} — réponse invalide")
        continue

    if data.get("id"):
        ok.append({"id": c["id"], "name": c["name"], "user_id": data["id"]})
        print(f"  [{i+1}/{len(clients)}] OK {c['id']} — {c['name']} ({email})")
    else:
        msg = data.get("message") or data.get("error") or str(data)
        errors.append({"id": c["id"], "name": c["name"], "error": msg})
        print(f"  [{i+1}/{len(clients)}] ERREUR {c['id']} — {msg}")

    # Petite pause pour ne pas saturer l'API
    time.sleep(0.05)

# ─── 4. Rapport ───────────────────────────────────────────────────────────────
print(f"\n{'='*50}")
print(f"RÉSULTAT : {len(ok)} créés | {len(skipped)} skippés | {len(errors)} erreurs")

if errors:
    print("\nERREURS :")
    for e in errors:
        print(f"  {e['id']} — {e['name']} : {e['error']}")

if skipped:
    print("\nSKIPPÉS :")
    for s in skipped:
        print(f"  {s['id']} — {s['name']} : {s['reason']}")

# Sauvegarder le rapport
report = {"created": ok, "skipped": skipped, "errors": errors}
with open("/tmp/create_accounts_report.json", "w") as f:
    json.dump(report, f, indent=2, ensure_ascii=False)
print("\nRapport sauvegardé : /tmp/create_accounts_report.json")
