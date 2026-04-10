import re

def load(path):
    d = {}
    with open(path) as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) == 2:
                fname, size = parts
                base = re.sub(r'\.[^.]*\.js$', '', fname)
                d[base] = (fname, int(size))
    return d

import os
TEMP = os.environ.get('TEMP', '/tmp')
prod  = load(os.path.join(TEMP, 'prod_sizes.txt'))
local = load(os.path.join(TEMP, 'local_sizes.txt'))

print("=== IDENTIQUES (meme hash) ===")
ok = [(b, prod[b][0]) for b in prod if b in local and prod[b][0] == local[b][0]]
for b, _ in sorted(ok): print(f"  {b}")
print(f"Total: {len(ok)}\n")

print("=== MODIFIES (hash different) ===")
print(f"{'CHUNK':<42} {'PROD':>8} {'LOCAL':>8} {'DELTA':>8}")
print("-"*72)
modified = []
for b in sorted(prod):
    if b in local and prod[b][0] != local[b][0]:
        ps, ls = prod[b][1], local[b][1]
        delta = ls - ps
        modified.append((b, ps, ls, delta))
        print(f"  {b:<40} {ps:>8} {ls:>8} {delta:>+8}")
print(f"Total: {len(modified)}\n")

print("=== PRESENTS PROD, ABSENTS LOCAL ===")
missing = [b for b in prod if b not in local]
for b in sorted(missing): print(f"  {b}  ({prod[b][1]} bytes)")
print()

print("=== PRESENTS LOCAL, ABSENTS PROD ===")
extras = [b for b in local if b not in prod]
for b in sorted(extras): print(f"  {b}  ({local[b][1]} bytes)")
print()

print("=== RESUME ===")
print(f"Identiques    : {len(ok)}")
print(f"Modifies      : {len(modified)}")
print(f"Absents local : {len(missing)}")
print(f"Nouveaux local: {len(extras)}")
