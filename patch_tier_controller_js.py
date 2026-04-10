"""
patch_tier_controller_js.py
Patche dist/controllers/tierController.js pour :
  1. Ajouter l'import manquant de pool_1 (pool_1.default.query est utilisé
     dans createUserAccount mais jamais importé → crash runtime)
  2. Remplacer la génération d'ID TIER-Date.now() par get_next_number()
     pour CLIENT / RESELLER / SUPPLIER
"""

FILE = "/var/www/trackyu-gps/backend/dist/controllers/tierController.js"

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

# ── FIX 1 : Import pool_1 manquant ──────────────────────────────────────────
IMPORT_ANCHOR = 'const tierRepository_1 = require("../repositories/tierRepository");'
IMPORT_POOL   = 'const pool_1 = __importDefault(require("../config/database"));'

if IMPORT_POOL in content:
    print("INFO fix1 : pool_1 déjà importé")
elif IMPORT_ANCHOR not in content:
    print("ERREUR fix1 : ancre d'import introuvable")
    exit(1)
else:
    content = content.replace(
        IMPORT_ANCHOR,
        IMPORT_ANCHOR + "\n" + IMPORT_POOL,
        1
    )
    print("OK fix1 : import pool_1 ajouté")

# ── FIX 2 : get_next_number() à la place de TIER-Date.now() ─────────────────
OLD_ID = "        const newId = id || `TIER-${Date.now()}`;"

NEW_ID = """\
        // --- Génération d'ID structuré via get_next_number() ---
        let newId;
        if (id) {
            newId = id;
        } else {
            const _moduleMap = { CLIENT: 'client', RESELLER: 'reseller', SUPPLIER: 'supplier' };
            const _module = _moduleMap[type];
            if (_module && effectiveTenantId) {
                try {
                    const _seqResult = yield pool_1.default.query(
                        'SELECT get_next_number($1, $2) AS next_id',
                        [effectiveTenantId, _module]
                    );
                    newId = _seqResult.rows[0].next_id;
                } catch (_seqErr) {
                    console.error('[TierController] get_next_number failed, fallback timestamp:', _seqErr);
                    newId = `TIER-${Date.now()}`;
                }
            } else {
                newId = `TIER-${Date.now()}`;
            }
        }
        // --- fin génération ID ---"""

if "get_next_number" in content and "--- Génération d'ID" in content:
    print("INFO fix2 : get_next_number déjà patché")
elif OLD_ID not in content:
    print("ERREUR fix2 : ligne cible ID introuvable — vérifiez le fichier")
    exit(1)
else:
    content = content.replace(OLD_ID, NEW_ID, 1)
    print("OK fix2 : get_next_number() injecté pour CLIENT/RESELLER/SUPPLIER")

with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)

print("\nPatch JS terminé.")
