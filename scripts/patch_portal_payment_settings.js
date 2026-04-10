/**
 * Patch: Ajoute GET /portal/payment-settings au portalRoutes.js
 * Retourne les liens de paiement Wave + numéro Orange Money du tenant
 *
 * Usage:
 *   node scripts/patch_portal_payment_settings.js
 *   scp scripts/patch_portal_payment_settings.js user@vps:/tmp/
 *   docker cp /tmp/patch_portal_payment_settings.js trackyu-backend:/tmp/
 *   docker exec trackyu-backend node /tmp/patch_portal_payment_settings.js
 */

const fs = require('fs');

const TARGET = '/app/dist/routes/portalRoutes.js';

if (!fs.existsSync(TARGET)) {
  console.error('❌ Fichier introuvable:', TARGET);
  process.exit(1);
}

let src = fs.readFileSync(TARGET, 'utf8');

// ── Guard: ne pas appliquer deux fois ──────────────────────────────────────
if (src.includes('/portal/payment-settings')) {
  console.log('✅ Patch déjà appliqué.');
  process.exit(0);
}

// ── Nouveau endpoint ────────────────────────────────────────────────────────
const NEW_ROUTE = `

// ── GET /portal/payment-settings ────────────────────────────────────────────
// Retourne les infos de paiement du tenant (non-secrètes)
router.get('/payment-settings', requireAuth, async (req, res) => {
  const tenantId = req.user.tenantId;
  try {
    // Wave: lien de paiement (paymentLinkBase dans credentials JSONB)
    const waveRes = await pool.query(
      \`SELECT credentials->>'paymentLinkBase' AS wave_link,
              is_active
       FROM integration_credentials
       WHERE tenant_id = $1 AND provider = 'wave'
       LIMIT 1\`,
      [tenantId]
    );
    const waveRow = waveRes.rows[0];
    const wave_link = (waveRow && waveRow.is_active && waveRow.wave_link) ? waveRow.wave_link : null;

    // Orange Money: numéro de téléphone (provider='orange_money', field 'phone')
    const orangeRes = await pool.query(
      \`SELECT credentials->>'phone' AS orange_number,
              credentials->>'name'  AS orange_name,
              is_active
       FROM integration_credentials
       WHERE tenant_id = $1 AND provider = 'orange_money'
       LIMIT 1\`,
      [tenantId]
    );
    const orangeRow = orangeRes.rows[0];
    const orange_number = (orangeRow && orangeRow.is_active && orangeRow.orange_number) ? orangeRow.orange_number : null;
    const orange_name   = (orangeRow && orangeRow.orange_name) ? orangeRow.orange_name : null;

    res.json({ wave_link, orange_number, orange_name });
  } catch (err) {
    console.error('[portal/payment-settings]', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});
`;

// ── Injection : avant la dernière ligne (module.exports = router) ───────────
const ANCHOR = 'module.exports = router';
if (!src.includes(ANCHOR)) {
  console.error('❌ Ancre introuvable:', ANCHOR);
  process.exit(1);
}

src = src.replace(ANCHOR, NEW_ROUTE + '\n' + ANCHOR);
fs.writeFileSync(TARGET, src, 'utf8');
console.log('✅ Patch /portal/payment-settings appliqué.');
