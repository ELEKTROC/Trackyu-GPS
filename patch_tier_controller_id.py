"""
patch_tier_controller_id.py
Remplace la génération d'ID fallback TIER-Date.now() par un appel
à la fonction SQL get_next_number() dans tierController.ts (VPS).

Modules couverts :
  CLIENT   → CLI-{SLUG}-{NNNNN}
  RESELLER → RSL-{SLUG}-{NNNNN}  (si counter existe, sinon REV-{SLUG}-{N})
  SUPPLIER → SUP-{SLUG}-{NNNNN}
  Autres   → TIER-{Date.now()} conservé
"""

OLD = "    const newId = id || `TIER-${Date.now()}`; // Simple ID generation if not provided"

NEW = """\
    // --- Génération d'ID structuré via get_next_number() ---
    let newId: string;
    if (id) {
      newId = id;
    } else {
      const moduleMap: Record<string, string> = {
        CLIENT: 'client',
        RESELLER: 'reseller',
        SUPPLIER: 'supplier',
      };
      const module = moduleMap[type as string];
      if (module && effectiveTenantId) {
        try {
          const seqResult = await pool.query(
            'SELECT get_next_number($1, $2) AS next_id',
            [effectiveTenantId, module]
          );
          newId = seqResult.rows[0].next_id as string;
        } catch (seqErr) {
          console.error('[TierController] get_next_number failed, using timestamp fallback:', seqErr);
          newId = `TIER-${Date.now()}`;
        }
      } else {
        newId = `TIER-${Date.now()}`;
      }
    }
    // --- fin génération ID ---"""

FILE_PATH = "/var/www/trackyu-gps/backend/src/controllers/tierController.ts"

with open(FILE_PATH, "r", encoding="utf-8") as f:
    content = f.read()

if OLD not in content:
    print("ERREUR : ligne cible introuvable — vérifiez le fichier")
    exit(1)

if "get_next_number" in content:
    print("INFO : get_next_number déjà présent — patch déjà appliqué ou conflit")
    exit(0)

patched = content.replace(OLD, NEW, 1)

with open(FILE_PATH, "w", encoding="utf-8") as f:
    f.write(patched)

print("OK : tierController.ts patché — get_next_number() actif pour CLIENT/RESELLER/SUPPLIER")
