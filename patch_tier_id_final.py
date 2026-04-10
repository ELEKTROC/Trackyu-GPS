"""
patch_tier_id_final.py
Corrections sur le bloc get_next_number() dans dist/controllers/tierController.js :
  1. Retire SUPPLIER du moduleMap (convention SUP- pas encore établie)
  2. Remplace le fallback TIER-Date.now() par un throw → HTTP 500
     (refus de création plutôt que ID non-conforme silencieux)
  3. Corrige aussi le fallback dans le else (type inconnu) → throw également

Note : RESELLER → 'reseller' → prefix REV est déjà correct dans la DB.
"""

FILE = "/var/www/trackyu-gps/backend/dist/controllers/tierController.js"

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

# ── Bloc à remplacer (inséré par le patch précédent) ────────────────────────
OLD = """\
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

NEW = """\
        // --- Génération d'ID structuré via get_next_number() ---
        // Modules couverts : CLIENT → CLI-{SLUG}-{N}, RESELLER → REV-{SLUG}-{N}
        // (SUPPLIER non inclus — convention SUP- pas encore établie pour tous les tenants)
        let newId;
        if (id) {
            newId = id;
        } else {
            const _moduleMap = { CLIENT: 'client', RESELLER: 'reseller' };
            const _module = _moduleMap[type];
            if (_module && effectiveTenantId) {
                const _seqResult = yield pool_1.default.query(
                    'SELECT get_next_number($1, $2) AS next_id',
                    [effectiveTenantId, _module]
                );
                newId = _seqResult.rows[0].next_id;
                if (!newId) {
                    throw new Error(`[TierController] get_next_number a retourné NULL pour module=${_module} tenant=${effectiveTenantId}`);
                }
            } else {
                throw new Error(`[TierController] Type de tier non supporté pour la génération d'ID : "${type}". Fournir un id explicite ou ajouter le module dans le mapping.`);
            }
        }
        // --- fin génération ID ---"""

if OLD not in content:
    print("ERREUR : bloc cible introuvable — le patch précédent n'est peut-être pas appliqué")
    exit(1)

content = content.replace(OLD, NEW, 1)

with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)

print("OK : fallback TIER-Date.now() supprimé → throw Error (HTTP 500)")
print("OK : SUPPLIER retiré du moduleMap (convention non établie)")
print("OK : RESELLER → 'reseller' → prefix REV conservé")
