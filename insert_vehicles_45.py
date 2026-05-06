"""
insert_vehicles_45.py
Insère 45 véhicules en production + 2 nouvelles branches.

Branches créées :
  BR-ABJ-EIBAT-NOAH     → ENTREPRISE NOAH  (CLI-ABJ-01506, tenant_abj)
  BR-ABJ-HASSANE-CAMIONS → CAMIONS          (CLI-ABJ-00022, tenant_abj)
"""

import subprocess
import random
import string
from datetime import datetime, timezone

def run_sql(sql, label=""):
    """Execute SQL via SSH → docker exec → psql (stdin)."""
    ssh_cmd = [
        "ssh", "-o", "ConnectTimeout=15", "root@148.230.126.62",
        "docker", "exec", "-i", "trackyu-gps-postgres-1",
        "psql", "-U", "fleet_user", "-d", "fleet_db",
        "-v", "ON_ERROR_STOP=1",
    ]
    result = subprocess.run(ssh_cmd, input=sql, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"ERREUR [{label}]:\n{result.stderr.strip()}")
        raise SystemExit(1)
    print(f"OK [{label}]")
    if result.stdout.strip():
        print(result.stdout.strip())
    return result.stdout

def gen_abo_id():
    chars = string.ascii_uppercase + string.digits
    return "ABO-" + ''.join(random.choices(chars, k=6))

def parse_date_creation(s):
    d, m, y = s.strip().split('-')
    return f"{y}-{m}-{d}"

def parse_date_install(s):
    parts = s.strip().split(' ')
    d, m, y = parts[0].split('-')
    t = parts[1] if len(parts) > 1 else "00:00"
    return f"{y}-{m}-{d} {t}:00"

# ── Mapping client ─────────────────────────────────────────────────────────────
CLIENT_MAP = {
    ("SMARTRACK SOLUTIONS", "LA ROUTE AFRICAINE"):    ("tenant_smt", "CLI-SMT-00013", "BR-SMT-MACHINES"),
    ("SMARTRACK SOLUTIONS", "LAGUNE TRANSIT"):         ("tenant_smt", "CLI-SMT-00014", "BR-SMT-LAGUNETRANSIT"),
    ("ABIDJAN GPS",         "EIBAT"):                  ("tenant_abj", "CLI-ABJ-01506", "BR-ABJ-EIBAT-NOAH"),
    ("ABIDJAN GPS",         "SAMPANAN HASSANE"):        ("tenant_abj", "CLI-ABJ-00022", "BR-ABJ-HASSANE-CAMIONS"),
    ("ABIDJAN GPS",         "ADJE CEDRIC MOHAMED"):     ("tenant_abj", "CLI-ABJ-00576", None),
    ("ABIDJAN GPS",         "AMLAN TRANSACTS"):         ("tenant_abj", "CLI-ABJ-01206", "BR-ABJ-TRAOREADAME"),
    ("ABIDJAN GPS",         "KANGA ARTHUR ROMEO"):      ("tenant_abj", "CLI-ABJ-01027", "BR-ABJ-KANGAARTHURROMEO"),
    ("ABIDJAN GPS",         "EGCT"):                   ("tenant_abj", "CLI-ABJ-00787", "BR-ABJ-ECGT"),
}

# ── Données véhicules (45 lignes) ──────────────────────────────────────────────
RAW = [
    ("SMARTRACK SOLUTIONS","LA ROUTE AFRICAINE","MACHINES",            "TEBU16",             "15042020005","17-05-2024","02-04-2026 00:00"),
    ("ABIDJAN GPS",        "EIBAT",             "ENTREPRISE NOAH",     "871W HOWO",           "15042020008","07-04-2026","07-04-2026 00:00"),
    ("ABIDJAN GPS",        "EIBAT",             "ENTREPRISE NOAH",     "1449LR01 HOWO",       "15042020009","09-04-2026","02-04-2026 00:00"),
    ("SMARTRACK SOLUTIONS","LAGUNE TRANSIT",     "LAGUNE TRANSIT",      "59214W",              "15042020017","18-08-2021","19-08-2021 00:00"),
    ("SMARTRACK SOLUTIONS","LAGUNE TRANSIT",     "LAGUNE TRANSIT",      "59216W",              "15042020019","18-08-2021","19-08-2021 09:51"),
    ("SMARTRACK SOLUTIONS","LA ROUTE AFRICAINE","MACHINES",            "TECH16",              "15042020020","11-04-2022","27-02-2026 00:00"),
    ("ABIDJAN GPS",        "EIBAT",             "ENTREPRISE NOAH",     "3786JN01 HOWO",       "15042020022","07-04-2026","07-04-2026 00:00"),
    ("ABIDJAN GPS",        "EIBAT",             "ENTREPRISE NOAH",     "875W HOWO",           "15042020027","09-04-2026","02-04-2026 00:00"),
    ("ABIDJAN GPS",        "EIBAT",             "ENTREPRISE NOAH",     "6398W HOWO",          "15042020029","07-04-2026","07-04-2026 00:00"),
    ("ABIDJAN GPS",        "EIBAT",             "ENTREPRISE NOAH",     "6399WHOWO",           "15042020034","07-04-2026","07-04-2026 00:00"),
    ("SMARTRACK SOLUTIONS","LA ROUTE AFRICAINE","MACHINES",            "TEBU17",              "15042020035","02-03-2026","02-04-2026 00:00"),
    ("ABIDJAN GPS",        "SAMPANAN HASSANE",  "CAMIONS",             "MATTEO",              "15042020037","02-10-2023","23-11-2024 00:00"),
    ("ABIDJAN GPS",        "SAMPANAN HASSANE",  "CAMIONS",             "3966JH01",            "15042020043","26-08-2022","08-10-2020 00:00"),
    ("ABIDJAN GPS",        "EIBAT",             "ENTREPRISE NOAH",     "6396W HOWO",          "15042020047","07-04-2026","07-04-2026 00:00"),
    ("SMARTRACK SOLUTIONS","LAGUNE TRANSIT",     "LAGUNE TRANSIT",      "2151LF01",            "15042020056","17-02-2026","10-02-2026 07:47"),
    ("ABIDJAN GPS",        "EIBAT",             "ENTREPRISE NOAH",     "872W HOWO",           "15042020064","07-04-2026","07-04-2026 00:00"),
    ("ABIDJAN GPS",        "EIBAT",             "ENTREPRISE NOAH",     "873W",                "15042020065","31-03-2026","31-03-2026 01:22"),
    ("SMARTRACK SOLUTIONS","LA ROUTE AFRICAINE","MACHINES",            "TECV17_",             "15042020066","02-03-2026","27-02-2026 00:00"),
    ("SMARTRACK SOLUTIONS","LA ROUTE AFRICAINE","MACHINES",            "TENV18",              "15042020070","02-03-2026","05-03-2026 00:00"),
    ("SMARTRACK SOLUTIONS","LA ROUTE AFRICAINE","MACHINES",            "TECV16",              "15042020072","02-03-2026","27-02-2026 00:00"),
    ("ABIDJAN GPS",        "SAMPANAN HASSANE",  "CAMIONS",             "HENRY",               "15042020073","24-11-2024","24-11-2024 02:19"),
    ("ABIDJAN GPS",        "EIBAT",             "ENTREPRISE NOAH",     "6394W HOWO",          "15042020077","07-04-2026","07-04-2026 00:00"),
    ("SMARTRACK SOLUTIONS","LA ROUTE AFRICAINE","MACHINES",            "TEBU18",              "15042020078","02-03-2026","02-04-2026 00:00"),
    ("SMARTRACK SOLUTIONS","LAGUNE TRANSIT",     "LAGUNE TRANSIT",      "59212W",              "15042020081","26-02-2022","03-02-2026 00:00"),
    ("SMARTRACK SOLUTIONS","LA ROUTE AFRICAINE","MACHINES",            "TEBU15",              "15042020082","25-03-2026","01-04-2026 00:00"),
    ("SMARTRACK SOLUTIONS","LA ROUTE AFRICAINE","MACHINES",            "TENV19",              "15042020085","02-03-2026","05-03-2026 00:00"),
    ("SMARTRACK SOLUTIONS","LAGUNE TRANSIT",     "LAGUNE TRANSIT",      "59215W",              "15042020088","18-08-2021","09-02-2026 00:00"),
    ("SMARTRACK SOLUTIONS","LAGUNE TRANSIT",     "LAGUNE TRANSIT",      "39975W",              "15042020090","02-04-2021","13-08-2021 00:00"),
    ("SMARTRACK SOLUTIONS","LAGUNE TRANSIT",     "LAGUNE TRANSIT",      "39974W HOWO",         "15042020092","04-02-2026","04-02-2026 00:00"),
    ("SMARTRACK SOLUTIONS","LA ROUTE AFRICAINE","MACHINES",            "TECH17",              "15042020093","14-10-2024","27-02-2026 00:00"),
    ("SMARTRACK SOLUTIONS","LA ROUTE AFRICAINE","MACHINES",            "TEPC17",              "15042020095","02-03-2026","27-02-2026 00:00"),
    ("ABIDJAN GPS",        "ADJE CEDRIC MOHAMED","ADJE CEDRIC MOHAMED","AA119",               "15042020097","01-03-2026","19-02-2026 07:25"),
    ("SMARTRACK SOLUTIONS","LAGUNE TRANSIT",     "LAGUNE TRANSIT",      "39976W HOWO",         "15042020099","18-08-2021","19-08-2021 10:55"),
    ("SMARTRACK SOLUTIONS","LAGUNE TRANSIT",     "LAGUNE TRANSIT",      "39973W HOWO",         "15042020100","24-08-2021","11-02-2026 00:00"),
    ("SMARTRACK SOLUTIONS","LA ROUTE AFRICAINE","MACHINES",            "TENV17",              "15042020115","02-03-2026","05-03-2026 00:00"),
    ("ABIDJAN GPS",        "EIBAT",             "ENTREPRISE NOAH",     "1430LY01",            "15042020118","01-04-2026","01-04-2026 12:21"),
    ("SMARTRACK SOLUTIONS","LA ROUTE AFRICAINE","MACHINES",            "TEPC18",              "15042020129","02-03-2026","27-02-2026 00:00"),
    ("ABIDJAN GPS",        "EIBAT",             "ENTREPRISE NOAH",     "2156LP01 RENAULT",    "15042020160","01-04-2026","01-04-2026 12:54"),
    ("ABIDJAN GPS",        "AMLAN TRANSACTS",   "TRAORE ADAME",        "590JT01 SACHMANN",    "15042020166","08-01-2026","08-01-2026 04:01"),
    ("ABIDJAN GPS",        "EIBAT",             "ENTREPRISE NOAH",     "878W HOWO",           "15042020171","07-04-2026","07-04-2026 00:00"),
    ("ABIDJAN GPS",        "KANGA ARTHUR ROMEO","KANGA ARTHUR ROMEO",  "AA387YJ01",           "15042020174","03-02-2026","28-01-2026 04:18"),
    ("ABIDJAN GPS",        "EGCT",              "ECGT",                "AA890ZJ SHACMAN",     "15042020177","26-02-2026","02-03-2026 00:00"),
    ("ABIDJAN GPS",        "EIBAT",             "ENTREPRISE NOAH",     "AA221YK SCANIA",      "15042020192","03-04-2026","01-04-2026 00:00"),
    ("SMARTRACK SOLUTIONS","LAGUNE TRANSIT",     "LAGUNE TRANSIT",      "MACHINE CH3712",      "15042020195","18-08-2021","19-08-2021 10:35"),
    ("SMARTRACK SOLUTIONS","LAGUNE TRANSIT",     "LAGUNE TRANSIT",      "59213W",              "15042020198","24-08-2021","24-08-2021 09:25"),
]

now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S+00")

# ── 1. Créer les 2 nouvelles branches ─────────────────────────────────────────
sql_branches = f"""
INSERT INTO branches (id, tenant_id, name, client_id, is_active, created_at, updated_at)
VALUES
  ('BR-ABJ-EIBAT-NOAH',      'tenant_abj', 'ENTREPRISE NOAH', 'CLI-ABJ-01506', true, '{now}', '{now}'),
  ('BR-ABJ-HASSANE-CAMIONS', 'tenant_abj', 'CAMIONS',         'CLI-ABJ-00022', true, '{now}', '{now}')
ON CONFLICT (id) DO NOTHING;
"""
run_sql(sql_branches, "INSERT branches")

# ── 2. Construire les INSERT des 45 objets ────────────────────────────────────
used_ids: set = set()
def unique_abo():
    while True:
        abo = gen_abo_id()
        if abo not in used_ids:
            used_ids.add(abo)
            return abo

values = []
for row in RAW:
    revendeur, entreprise, ligne, plaque, imei, date_crea, date_install = row
    key = (revendeur, entreprise)
    if key not in CLIENT_MAP:
        print(f"MAPPING MANQUANT: {key}")
        raise SystemExit(1)
    tenant_id, client_id, branch_id = CLIENT_MAP[key]
    abo = unique_abo()
    created_at = parse_date_creation(date_crea)
    entry_date = parse_date_install(date_install)
    branch_val = f"'{branch_id}'" if branch_id else "NULL"
    name_esc  = plaque.replace("'", "''")
    plate_esc = plaque.replace("'", "''")
    values.append(
        f"('{abo}', '{tenant_id}', '{imei}', '{name_esc}', '{plate_esc}', "
        f"'{client_id}', {branch_val}, 'INSTALLED', 'OFFLINE', "
        f"'{created_at}', '{entry_date}', '{now}')"
    )

sql_objects = (
    "INSERT INTO objects "
    "(id, tenant_id, imei, name, plate, client_id, branch_id, device_status, status, created_at, entry_date, updated_at) "
    "VALUES\n" +
    ",\n".join(values) +
    "\nON CONFLICT (id) DO NOTHING;"
)

run_sql(sql_objects, "INSERT objects (45)")

# ── 3. Vérification ────────────────────────────────────────────────────────────
run_sql(
    "SELECT COUNT(*) AS total FROM objects WHERE imei LIKE '15042020%';",
    "COUNT final"
)

print("\nInsertion terminée avec succès.")
