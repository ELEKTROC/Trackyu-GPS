/**
 * Configure le numéro Orange Money du tenant dans integration_credentials
 * À adapter avec le bon tenantId et numéro avant exécution.
 *
 * Usage:
 *   TENANT_ID=xxx ORANGE_PHONE="+221XXXXXXXX" ORANGE_NAME="TrackYu GPS" \
 *   node scripts/set_orange_money_number.js
 *
 *   docker exec trackyu-backend node /tmp/set_orange_money_number.js
 */

const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const tenantId   = process.env.TENANT_ID;
const phone      = process.env.ORANGE_PHONE;
const name       = process.env.ORANGE_NAME || 'TrackYu GPS';

if (!tenantId || !phone) {
  console.error('Usage: TENANT_ID=xxx ORANGE_PHONE="+221XXXXXXXX" node set_orange_money_number.js');
  process.exit(1);
}

async function run() {
  try {
    await pool.query(
      `INSERT INTO integration_credentials (id, tenant_id, provider, credentials, is_active, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, 'orange_money', $2::jsonb, true, NOW(), NOW())
       ON CONFLICT (tenant_id, provider)
       DO UPDATE SET credentials = $2::jsonb, is_active = true, updated_at = NOW()`,
      [tenantId, JSON.stringify({ phone, name })]
    );
    console.log('✅ Numéro Orange Money configuré:', phone);
  } catch (err) {
    console.error('❌ Erreur:', err.message);
  } finally {
    pool.end();
  }
}

run();
