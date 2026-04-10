// @ts-nocheck

import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function check() {
    await client.connect();
    const res = await client.query(`SELECT tenant_id, module FROM numbering_counters ORDER BY tenant_id, module`);
    console.log('--- Counters ---');
    res.rows.forEach(r => console.log(`${r.tenant_id}: ${r.module}`));
    await client.end();
}

check().catch(console.error);
