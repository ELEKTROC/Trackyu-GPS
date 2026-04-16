# -*- coding: utf-8 -*-
#!/usr/bin/env python3
"""
Patch : TierSchema notes + autres champs string nullable
notes: z.string().optional() → z.string().nullish()
Même correction pour tous les champs string optionnels qui peuvent être null en BD.
"""
import subprocess, tempfile, os

CONTAINER = "trackyu-gps-backend-1"

def read_remote(path):
    r = subprocess.run(
        ["ssh", "root@148.230.126.62", f"docker exec {CONTAINER} cat {path}"],
        capture_output=True, text=True, encoding='utf-8'
    )
    return r.stdout

def write_remote(path, content):
    with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False, encoding='utf-8') as f:
        f.write(content)
        tmp = f.name
    try:
        tmp_remote = f"/tmp/patch_tier_schema_{os.path.basename(tmp)}"
        subprocess.run(["scp", tmp, f"root@148.230.126.62:{tmp_remote}"], check=True, capture_output=True)
        subprocess.run(
            ["ssh", "root@148.230.126.62", f"docker cp {tmp_remote} {CONTAINER}:{path} && rm {tmp_remote}"],
            check=True, capture_output=True
        )
    finally:
        os.unlink(tmp)

print("=== PATCH TIER SCHEMA NULLISH ===\n")

path = "/app/dist/schemas/index.js"
content = read_remote(path)

# Fix: tous les champs string.optional() du TierSchema qui peuvent être null en BD
OLD = """TierSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, "Le nom est requis"),
    type: zod_1.z.enum(['CLIENT', 'SUPPLIER', 'RESELLER', 'PROSPECT']),
    email: zod_1.z.string().email("Adresse email invalide").optional().or(zod_1.z.literal('')).transform(v => v === '' ? undefined : v),
    phone: phoneSchema,
    address: zod_1.z.string().optional(),
    city: zod_1.z.string().optional(),
    country: zod_1.z.string().optional().default('Côte d\'Ivoire'),
    vatNumber: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),"""

NEW = """TierSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, "Le nom est requis"),
    type: zod_1.z.enum(['CLIENT', 'SUPPLIER', 'RESELLER', 'PROSPECT']),
    email: zod_1.z.string().email("Adresse email invalide").optional().or(zod_1.z.literal('')).transform(v => v === '' ? undefined : v),
    phone: phoneSchema,
    address: zod_1.z.string().nullish(),
    city: zod_1.z.string().nullish(),
    country: zod_1.z.string().nullish().default('Côte d\'Ivoire'),
    vatNumber: zod_1.z.string().nullish(),
    notes: zod_1.z.string().nullish(),"""

if OLD not in content:
    print("ERREUR : cible TierSchema introuvable")
    idx = content.find("notes: zod_1.z.string().optional()")
    if idx >= 0:
        print(f"Trouvé 'notes: z.string().optional()' à index {idx}")
        print(content[max(0,idx-300):idx+50])
    exit(1)

content = content.replace(OLD, NEW)
write_remote(path, content)
print("OK schemas/index.js patché")

r = subprocess.run(
    ["ssh", "root@148.230.126.62", "docker restart trackyu-gps-backend-1"],
    capture_output=True, text=True
)
print("Redémarrage:", r.stdout.strip())
print("=== DONE ===")
