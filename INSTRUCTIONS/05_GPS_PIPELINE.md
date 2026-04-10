# 📡 Pipeline GPS

## Architecture du Flux GPS

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  Trackers GPS   │────▶│  gps-server (TCP)    │────▶│  PositionBuffer │
│  (GT06, JT808)  │     │  Port 5000           │     │  (Batch INSERT) │
└─────────────────┘     └──────────────────────┘     └─────────────────┘
                                │                            │
                                ▼                            ▼
                        ┌──────────────┐            ┌─────────────────┐
                        │    Redis     │            │  TimescaleDB    │
                        │ (Cache IMEI) │            │  (positions)    │
                        └──────────────┘            └─────────────────┘
                                │
                                ▼
                        ┌──────────────┐
                        │  Socket.IO   │────▶ Frontend (temps réel)
                        └──────────────┘
```

## 🔌 Protocoles GPS Supportés

| Protocole | Fichier | Trackers Compatibles |
|-----------|---------|----------------------|
| GT06 | `parsers/gt06.ts` | Concox, Coban, JM-VL01/02 |
| JT808 | `parsers/jt808.ts` | Trackers chinois standard |
| Text Protocol | `parsers/textProtocol.ts` | Format texte simple |
| Text Extended | `parsers/textExtended.ts` | Format texte étendu |

## 📦 Structure du Serveur GPS

```
backend/src/gps-server/
├── server.ts           # Serveur TCP principal
└── parsers/
    ├── index.ts        # Interface GpsParser
    ├── gt06.ts         # Protocole GT06
    ├── jt808.ts        # Protocole JT808
    ├── textProtocol.ts # Format texte
    └── textExtended.ts # Format étendu
```

## 🔄 Flux de Données

### 1. Réception TCP

```typescript
// server.ts
const server = net.createServer((socket) => {
  socket.on('data', async (data) => {
    // 1. Identifier le protocole
    const parser = parsers.find(p => p.canParse(data));
    if (!parser) return;
    
    // 2. Parser les données
    const parsed = parser.parse(data);
    // { imei, latitude, longitude, speed, heading, timestamp }
    
    // 3. Lookup véhicule via cache
    const vehicle = await CacheService.getVehicleByImei(parsed.imei);
    if (!vehicle) {
      logger.warn(`Unknown IMEI: ${parsed.imei}`);
      return;
    }
    
    // 4. Ajouter au buffer
    positionBuffer.add({
      vehicle_id: vehicle.id,
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      speed: parsed.speed,
      heading: parsed.heading,
      time: parsed.timestamp
    });
    
    // 5. Émettre en temps réel
    getIO().to(`tenant:${vehicle.tenantId}`).emit('vehicle:update', {
      vehicleId: vehicle.id,
      position: parsed
    });
  });
});

server.listen(5000);
```

### 2. Interface Parser

```typescript
// parsers/index.ts
export interface GpsParser {
  name: string;
  canParse(data: Buffer): boolean;
  parse(data: Buffer): GpsData | null;
}

export interface GpsData {
  imei: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  timestamp: Date;
  fuel?: number;
  ignition?: boolean;
  raw?: string;
}
```

### 3. Exemple Parser GT06

```typescript
// parsers/gt06.ts
export const gt06Parser: GpsParser = {
  name: 'GT06',
  
  canParse(data: Buffer): boolean {
    // GT06 commence par 0x78 0x78 ou 0x79 0x79
    return data[0] === 0x78 && data[1] === 0x78;
  },
  
  parse(data: Buffer): GpsData | null {
    // Extraire IMEI, coordonnées, vitesse...
    const imei = extractImei(data);
    const lat = extractLatitude(data);
    const lng = extractLongitude(data);
    // ...
    
    return { imei, latitude: lat, longitude: lng, ... };
  }
};
```

## 🚀 Services d'Optimisation

### CacheService

```typescript
// services/cacheService.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export const CacheService = {
  // Cache IMEI → Vehicle (évite lookups DB)
  async getVehicleByImei(imei: string) {
    const cached = await redis.get(`vehicle:imei:${imei}`);
    if (cached) return JSON.parse(cached);
    
    // Fallback DB
    const result = await pool.query(
      'SELECT v.* FROM vehicles v JOIN devices d ON v.device_id = d.id WHERE d.imei = $1',
      [imei]
    );
    
    if (result.rows[0]) {
      await redis.set(`vehicle:imei:${imei}`, JSON.stringify(result.rows[0]), 'EX', 3600);
    }
    
    return result.rows[0];
  },
  
  // Cache dernière position
  async getLastPosition(vehicleId: string) {
    const cached = await redis.get(`position:last:${vehicleId}`);
    return cached ? JSON.parse(cached) : null;
  },
  
  async setLastPosition(vehicleId: string, position: any) {
    await redis.set(`position:last:${vehicleId}`, JSON.stringify(position), 'EX', 86400);
  }
};
```

### PositionBuffer

```typescript
// services/positionBuffer.ts
const BATCH_SIZE = 100;
const FLUSH_INTERVAL = 5000; // 5 secondes

class PositionBuffer {
  private buffer: Position[] = [];
  
  add(position: Position) {
    this.buffer.push(position);
    
    if (this.buffer.length >= BATCH_SIZE) {
      this.flush();
    }
  }
  
  async flush() {
    if (this.buffer.length === 0) return;
    
    const positions = [...this.buffer];
    this.buffer = [];
    
    // INSERT batch
    const values = positions.map((p, i) => 
      `($${i*6+1}, $${i*6+2}, $${i*6+3}, $${i*6+4}, $${i*6+5}, $${i*6+6})`
    ).join(',');
    
    const params = positions.flatMap(p => [
      p.vehicle_id, p.latitude, p.longitude, p.speed, p.heading, p.time
    ]);
    
    await pool.query(`
      INSERT INTO positions (vehicle_id, latitude, longitude, speed, heading, time)
      VALUES ${values}
    `, params);
  }
}

// Flush périodique
setInterval(() => positionBuffer.flush(), FLUSH_INTERVAL);
```

## 🗄️ Tables TimescaleDB

```sql
-- Table principale (hypertable)
CREATE TABLE positions (
  time        TIMESTAMPTZ NOT NULL,
  vehicle_id  UUID NOT NULL REFERENCES vehicles(id),
  latitude    DOUBLE PRECISION NOT NULL,
  longitude   DOUBLE PRECISION NOT NULL,
  speed       REAL DEFAULT 0,
  heading     REAL DEFAULT 0,
  fuel_liters REAL,
  raw_data    TEXT
);

-- Convertir en hypertable (partitionnement automatique)
SELECT create_hypertable('positions', 'time');

-- Index pour requêtes véhicule
CREATE INDEX idx_positions_vehicle ON positions (vehicle_id, time DESC);

-- Compression automatique (données > 7 jours)
ALTER TABLE positions SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'vehicle_id'
);
SELECT add_compression_policy('positions', INTERVAL '7 days');

-- Rétention automatique (supprimer > 1 an)
SELECT add_retention_policy('positions', INTERVAL '1 year');
```

## 📊 API Historique

```typescript
// GET /api/fleet/vehicles/:vehicleId/history
router.get('/:vehicleId/history', async (req, res) => {
  const { vehicleId } = req.params;
  const { startDate, endDate } = req.query;
  
  const result = await pool.query(`
    SELECT time, latitude, longitude, speed, heading
    FROM positions
    WHERE vehicle_id = $1
      AND time BETWEEN $2 AND $3
    ORDER BY time ASC
  `, [vehicleId, startDate, endDate]);
  
  res.json(result.rows);
});

// GET /api/fleet/trips/:tripId
router.get('/trips/:tripId', async (req, res) => {
  const { tripId } = req.params;
  
  const trip = await pool.query('SELECT * FROM trips WHERE id = $1', [tripId]);
  const positions = await pool.query(`
    SELECT * FROM positions
    WHERE vehicle_id = $1
      AND time BETWEEN $2 AND $3
    ORDER BY time
  `, [trip.rows[0].vehicle_id, trip.rows[0].start_time, trip.rows[0].end_time]);
  
  res.json({ trip: trip.rows[0], positions: positions.rows });
});

// POST /api/fleet/vehicles/:vehicleId/calculate-trips
router.post('/:vehicleId/calculate-trips', async (req, res) => {
  const { vehicleId } = req.params;
  const { date } = req.query;
  
  // Algorithme de détection des trajets
  // (arrêt > 5 min = fin de trajet)
  const trips = await calculateTrips(vehicleId, date);
  
  res.json({ trips });
});
```

## 🔧 Ajouter un Nouveau Protocole

```typescript
// 1. Créer le fichier parsers/{protocol}.ts
export const myProtocolParser: GpsParser = {
  name: 'MyProtocol',
  
  canParse(data: Buffer): boolean {
    // Identifier le protocole par les premiers octets
    return data[0] === 0xXX && data[1] === 0xYY;
  },
  
  parse(data: Buffer): GpsData | null {
    // Extraire les données
    const imei = ...;
    const latitude = ...;
    const longitude = ...;
    
    return {
      imei,
      latitude,
      longitude,
      speed: 0,
      heading: 0,
      timestamp: new Date()
    };
  }
};

// 2. Enregistrer dans server.ts
import { myProtocolParser } from './parsers/myProtocol';

const parsers: GpsParser[] = [
  gt06Parser,
  jt808Parser,
  myProtocolParser,  // Ajouter ici
  textProtocolParser
];
```

## 🧪 Tests de Charge

```bash
# Simuler 100 trackers GPS
npm run load-test:100

# Simuler 1000 trackers
npm run load-test:1000

# Résultats attendus
# 100 trackers: < 50ms latence moyenne
# 1000 trackers: < 200ms latence moyenne
```

---

*Dernière mise à jour : 2026-02-10*
