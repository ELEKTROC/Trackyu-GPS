const db = require('./dist/config/database').default;
const {ReverseGeocodingService} = require('./dist/services/ReverseGeocodingService');

(async () => {
  const lat = 5.395746666666667;
  const lng = -3.940401666666667;
  const vehicleId = 'ABO-7C02B7';

  const addr = await ReverseGeocodingService.resolve(lat, lng);
  console.log('Address resolved:', addr);
  if (!addr) { console.log('No address'); process.exit(0); }

  await db.query('UPDATE objects SET address = $1 WHERE id = $2', [addr, vehicleId]);
  console.log('objects updated');

  const r = await db.query('SELECT MAX(time) as mt FROM positions WHERE object_id = $1', [vehicleId]);
  const mt = r.rows[0].mt;
  await db.query('UPDATE positions SET address = $1 WHERE object_id = $2 AND time = $3', [addr, vehicleId, mt]);
  console.log('positions updated, time:', mt);

  process.exit(0);
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
