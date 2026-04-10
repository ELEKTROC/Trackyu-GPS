// backend/src/services/cacheService.ts
// Cache Redis pour le pipeline GPS : IMEI → Véhicule, dernière position
// Utilisé pour valider les boîtiers et éviter des requêtes DB à chaque paquet

interface CachedVehicle {
  id: string;
  tenantId: string;
  name: string;
  plate: string;
  tankCapacity?: number;
  fuelSmoothingAlpha?: number;
  calibrationTable?: [number, number][];
  refillThreshold?: number;
  theftThreshold?: number;
  lastFuelLevel?: number;
  odometerSource?: 'GPS' | 'CAN' | 'SENSOR';
}

interface CachedPosition {
  latitude: number;
  longitude: number;
  timestamp: Date | string;
  speed: number;
}

// TTL en secondes
const TTL = {
  VEHICLE: 300,       // 5 minutes
  DEVICE: 600,        // 10 minutes
  LAST_POS: 60,       // 1 minute
  INVALID_IMEI: 3600, // 1 heure (pour éviter des DB lookups répétés sur IMEI inconnu)
};

class CacheServiceClass {
  private client: any = null;
  private ready = false;
  // Fallback mémoire si Redis indisponible
  private memCache: Map<string, { value: any; expires: number }> = new Map();

  constructor() {
    this.connect();
    // Nettoyage périodique du cache mémoire
    setInterval(() => this.cleanMemCache(), 60_000);
  }

  private async connect() {
    try {
      const { createClient } = await import('redis');
      this.client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
      this.client.on('error', (err: Error) => {
        if (this.ready) console.warn('[Cache] Redis erreur, bascule sur cache mémoire:', err.message);
        this.ready = false;
      });
      this.client.on('ready', () => {
        console.info('[Cache] Redis connecté');
        this.ready = true;
      });
      await this.client.connect();
    } catch {
      console.warn('[Cache] Redis non disponible — utilisation du cache mémoire uniquement');
    }
  }

  private async get(key: string): Promise<string | null> {
    if (this.ready && this.client) {
      return this.client.get(key);
    }
    const entry = this.memCache.get(key);
    if (!entry || Date.now() > entry.expires) return null;
    return JSON.stringify(entry.value);
  }

  private async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (this.ready && this.client) {
      await this.client.set(key, serialized, { EX: ttlSeconds });
    } else {
      this.memCache.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
    }
  }

  private async del(key: string): Promise<void> {
    if (this.ready && this.client) await this.client.del(key);
    this.memCache.delete(key);
  }

  private cleanMemCache(): void {
    const now = Date.now();
    for (const [k, v] of this.memCache.entries()) {
      if (now > v.expires) this.memCache.delete(k);
    }
  }

  // ─── API publique ──────────────────────────────────────────────────────────

  async isDeviceKnown(imei: string): Promise<boolean> {
    const notFoundKey = `invalid:${imei}`;
    const cached = await this.get(notFoundKey);
    if (cached === 'true') return false; // Confirmé inconnu

    const vehicle = await this.getVehicleByImei(imei);
    if (!vehicle) {
      await this.set(notFoundKey, true, TTL.INVALID_IMEI);
      return false;
    }
    return true;
  }

  async getVehicleByImei(imei: string): Promise<CachedVehicle | null> {
    const key = `vehicle:imei:${imei}`;
    const cached = await this.get(key);
    if (cached) return JSON.parse(cached) as CachedVehicle;

    // Lookup DB
    let pool: any;
    try {
      const mod = await import('../config/database.js');
      pool = mod.default;
    } catch { return null; }

    const result = await pool.query(
      `SELECT v.id, v.tenant_id, v.name, v.plate, v.tank_capacity,
              v.fuel_smoothing_alpha, v.calibration_table,
              v.refill_threshold, v.theft_threshold, v.odometer_source
       FROM vehicles v
       JOIN device_stock ds ON ds.assigned_vehicle_id = v.id
       WHERE ds.imei = $1 AND ds.status = 'INSTALLED'
       LIMIT 1`,
      [imei]
    ).catch(() => ({ rows: [] }));

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    const vehicle: CachedVehicle = {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      plate: row.plate,
      tankCapacity: row.tank_capacity,
      fuelSmoothingAlpha: row.fuel_smoothing_alpha,
      calibrationTable: row.calibration_table,
      refillThreshold: row.refill_threshold,
      theftThreshold: row.theft_threshold,
      odometerSource: row.odometer_source,
    };

    await this.set(key, vehicle, TTL.VEHICLE);
    return vehicle;
  }

  async getLastPosition(vehicleId: string): Promise<CachedPosition | null> {
    const key = `pos:last:${vehicleId}`;
    const cached = await this.get(key);
    if (!cached) return null;
    return JSON.parse(cached) as CachedPosition;
  }

  async setLastPosition(vehicleId: string, pos: CachedPosition): Promise<void> {
    await this.set(`pos:last:${vehicleId}`, pos, TTL.LAST_POS);
  }

  async invalidateVehicle(imei: string): Promise<void> {
    await this.del(`vehicle:imei:${imei}`);
    await this.del(`invalid:${imei}`);
  }

  get isRedisReady(): boolean {
    return this.ready;
  }
}

export const CacheService = new CacheServiceClass();
