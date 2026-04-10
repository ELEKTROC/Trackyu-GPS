# AUDIT MODULE GPS/MAP - TrackYu GPS

**Date**: 2026-02-03  
**Auditeur**: Security Expert AI  
**Scope**: GPS Pipeline, Parsers, Buffer, Cache, WebSocket, Controllers  

---

## Score Global : 4/10 ⚠️

**CRITIQUE** - Plusieurs vulnérabilités majeures nécessitent une action immédiate.

---

## Fichiers Analysés

| Fichier | Lignes | Rôle |
|---------|--------|------|
| `backend/src/gps-server/server.ts` | 431 | Serveur TCP GPS principal |
| `backend/src/gps-server/parsers/gt06.ts` | 123 | Parser protocole GT06 |
| `backend/src/gps-server/parsers/jt808.ts` | 115 | Parser protocole JT808 |
| `backend/src/services/positionBuffer.ts` | 207 | Buffer batch INSERT positions |
| `backend/src/services/cacheService.ts` | 284 | Cache Redis IMEI→Vehicle |
| `backend/src/services/socketThrottle.ts` | 172 | Rate limiting WebSocket |
| `backend/src/controllers/vehicleController.ts` | 743 | API REST véhicules |
| `backend/src/socket.ts` | 56 | Configuration Socket.IO |
| `features/map/components/MapView.tsx` | 1939 | Frontend carte React |

**Total**: ~4070 lignes auditées

---

## 🔴 CRITIQUES (Bloquant Production)

### 1. ❌ GPS SPOOFING - IMEI Hardcodé dans Parser GT06

**Fichier**: `backend/src/gps-server/parsers/gt06.ts:104`

**Problème**:
```typescript
return {
    imei: 'GT06-DEVICE',  // ❌ IMEI HARDCODÉ!
    latitude: lat,
    longitude: lng,
    // ...
}
```

**Impact**: 
- **CRITIQUE** - Tous les trackers GT06 partagent le même IMEI fictif
- Impossible de différencier les appareils
- Risque de collision dans le cache Redis (mauvais véhicule)
- Faille de sécurité : un attacker peut envoyer des fausses positions

**Preuve**:
1. GT06Parser ne parse pas l'IMEI du buffer
2. CacheService.getVehicleByImei('GT06-DEVICE') retournera toujours le même véhicule
3. Positions de différents trackers vont écraser le cache

**Solution**:
```typescript
// gt06.ts - Extraire l'IMEI du buffer
parse(data: Buffer | string): GpsData | null {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
    
    // GT06: L'IMEI est généralement envoyé dans le paquet Login (0x01)
    // Pour les paquets Location (0x22), on doit le mémoriser par socket
    // Solution temporaire: extraire du contexte ou forcer Login d'abord
    
    // IMEI dans GT06 Login packet (Protocol Number 0x01):
    // Structure: Start(2) + Length(1) + Protocol(1) + IMEI(8 bytes BCD) + ...
    
    if (protocol === 0x01) { // Login packet
        const imeiBcd = buf.slice(4, 12); // 8 bytes BCD
        const imei = this.parseBcdImei(imeiBcd);
        return { imei, /* ... */ };
    }
    
    // Pour autres paquets, utiliser contexte socket (voir recommandation #2)
    throw new Error('GT06: IMEI context required for non-login packets');
}

private parseBcdImei(bcdBytes: Buffer): string {
    let imei = '';
    for (let i = 0; i < bcdBytes.length; i++) {
        const high = (bcdBytes[i] >> 4) & 0x0F;
        const low = bcdBytes[i] & 0x0F;
        imei += high.toString() + low.toString();
    }
    return imei.substring(0, 15); // IMEI = 15 digits
}
```

**Correction Complète Recommandée**:
1. Modifier `server.ts` pour mémoriser IMEI par socket (Map<Socket, string>)
2. Parser le paquet Login (0x01) pour extraire l'IMEI
3. Stocker dans `socketImeiMap.set(socket, imei)`
4. Utiliser cet IMEI pour tous les paquets suivants de ce socket

---

### 2. ❌ ABSENCE DE VALIDATION IMEI AVANT INSERT POSITIONS

**Fichier**: `backend/src/gps-server/server.ts:235-247`

**Problème**:
```typescript
positionBuffer.add({
    vehicle_id: vehicle.id,
    latitude: data.latitude,
    longitude: data.longitude,
    // ...
});
```

**Mais AVANT, ligne 150-159**:
```typescript
const vehicle = await CacheService.getVehicleByImei(data.imei);

if (vehicle) {
    // ✅ OK - On insert seulement si véhicule existe
}
```

**Analyse**: Partiellement protégé mais **incomplet**.

**Vulnérabilité Résiduelle**:
1. Si `vehicle` est `null` (IMEI inconnu), le code continue ligne 421:
```typescript
logger.info(`ℹ️ STOCK: Device ${data.imei} is in stock.`);
// ❌ PAS d'INSERT dans positions, mais pas de RATE LIMITING non plus
```

2. **Attaque DoS possible**:
   - Envoyer 10 000 paquets GPS avec IMEI invalides
   - Chaque paquet déclenche :
     - `CacheService.isDeviceKnown()` → DB query si cache miss
     - `CacheService.getVehicleByImei()` → DB query si cache miss
   - Saturation de la DB avec des lookups inutiles

**Solution**:
```typescript
// server.ts - Ajouter rate limiting par IMEI
const imeiRateLimiter = new Map<string, { count: number; resetAt: number }>();
const MAX_PACKETS_PER_IMEI = 10; // 10 paquets/minute pour IMEI inconnus
const WINDOW_MS = 60000;

const handleGpsData = async (data: GpsData): Promise<boolean> => {
    // 1. Vérifier device connu (CACHED)
    const deviceKnown = await CacheService.isDeviceKnown(data.imei);
    
    if (!deviceKnown) {
        // Rate limit pour IMEI inconnus
        const now = Date.now();
        const limiter = imeiRateLimiter.get(data.imei) || { count: 0, resetAt: now + WINDOW_MS };
        
        if (now > limiter.resetAt) {
            limiter.count = 0;
            limiter.resetAt = now + WINDOW_MS;
        }
        
        limiter.count++;
        imeiRateLimiter.set(data.imei, limiter);
        
        if (limiter.count > MAX_PACKETS_PER_IMEI) {
            logger.warn(`⚠️ RATE LIMIT: IMEI ${data.imei} exceeded limit`);
            metrics.gpsRateLimitExceeded.inc();
            return false; // Bloquer
        }
        
        logger.warn(`⚠️ UNKNOWN DEVICE: IMEI ${data.imei}`);
        return false;
    }
    
    // 2. Continue normal flow...
}
```

---

### 3. ❌ SQL INJECTION via updatePosition Controller

**Fichier**: `backend/src/controllers/vehicleController.ts:207-217`

**DÉJÀ IDENTIFIÉ** mais non corrigé:

```typescript
export const updatePosition = async (req: Request, res: Response) => {
  const { vehicleId } = req.params;  // ❌ Pas de validation UUID
  const { lat, lng, speed, heading, status, fuelLevel } = req.body; // ❌ Pas de validation

  // 1. Insert into positions (History)
  const positionQuery = `
    INSERT INTO positions (time, vehicle_id, latitude, longitude, speed, heading)
    VALUES (NOW(), $1, $2, $3, $4, $5)
  `;
  await pool.query(positionQuery, [vehicleId, lat, lng, speed || 0, heading || 0]);
  // ✅ Requête paramétrée OK
```

**Problèmes**:
1. ❌ **Pas de validation des coordonnées GPS**:
   - `lat` peut être n'importe quoi (999, null, string)
   - `lng` idem
   - PostgreSQL acceptera des valeurs invalides

2. ❌ **Pas de filtrage tenant_id**:
   - Un utilisateur peut envoyer positions pour n'importe quel vehicleId
   - Fuite d'isolation multi-tenant

3. ❌ **Route exposée sans rate limiting**:
```typescript
// routes/vehicleRoutes.ts:27
router.post('/:vehicleId/position', authenticateApiKey, updatePosition);
```

**Solution**:
```typescript
import { z } from 'zod';

const PositionSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  speed: z.number().min(0).max(500).default(0),
  heading: z.number().min(0).max(360).default(0),
  status: z.enum(['MOVING', 'IDLE', 'STOPPED']).optional(),
  fuelLevel: z.number().min(0).max(100).optional()
});

export const updatePosition = async (req: Request, res: Response) => {
  const { vehicleId } = req.params;
  
  // 1. Valider input
  const validation = PositionSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ errors: validation.error.flatten() });
  }
  
  const { lat, lng, speed, heading, status, fuelLevel } = validation.data;
  
  // 2. Vérifier ownership (TENANT ISOLATION)
  const vehicleCheck = await pool.query(
    'SELECT tenant_id FROM vehicles WHERE id = $1',
    [vehicleId]
  );
  
  if (vehicleCheck.rows.length === 0) {
    return res.status(404).json({ message: 'Vehicle not found' });
  }
  
  // Si pas SuperAdmin, vérifier tenant
  if (req.user.role !== 'SUPERADMIN' && vehicleCheck.rows[0].tenant_id !== req.user.tenantId) {
    return res.status(403).json({ message: 'Forbidden: Not your vehicle' });
  }
  
  // 3. Insert position...
}
```

---

### 4. ❌ WEBSOCKET BROADCAST SANS FILTRAGE TENANT

**Fichier**: `backend/src/socket.ts:1-56`

**Problème**:
```typescript
io.on('connection', (socket) => {
    socket.on('join:tenant', (tenantId: string) => {
      if (tenantId) {  // ❌ Pas de vérification AUTH
        socket.join(`tenant:${tenantId}`);
      }
    });
});
```

**Vulnérabilité**:
1. **N'importe quel client peut rejoindre n'importe quel tenant**:
   - Client A se connecte
   - Émet `join:tenant('tenant-xyz')` 
   - Reçoit toutes les positions GPS du tenant XYZ

2. **Pas de vérification JWT**:
   - WebSocket accepte connexions sans authentification
   - Aucune validation que le client appartient au tenant

**Preuve d'Exploitation**:
```javascript
// Script attacker
const io = require('socket.io-client');
const socket = io('https://trackyugps.com');

socket.on('connect', () => {
  console.log('Connected');
  // Rejoindre tous les tenants possibles
  for (let i = 0; i < 1000; i++) {
    socket.emit('join:tenant', `tenant-${i}`);
  }
});

// Écouter TOUTES les positions
socket.on('vehicle:update', (data) => {
  console.log('Stolen position:', data);
});
```

**Solution**:
```typescript
import jwt from 'jsonwebtoken';

io.use((socket, next) => {
  // 1. Vérifier token JWT
  const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return next(new Error('Authentication required'));
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    socket.data.user = decoded; // Stocker user dans socket
    next();
  } catch (err) {
    return next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const user = socket.data.user;
  
  socket.on('join:tenant', (tenantId: string) => {
    // 2. Vérifier que l'user appartient au tenant
    if (user.role === 'SUPERADMIN' || user.tenantId === tenantId) {
      socket.join(`tenant:${tenantId}`);
      console.log(`✅ ${user.email} joined tenant:${tenantId}`);
    } else {
      console.warn(`❌ ${user.email} DENIED access to tenant:${tenantId}`);
      socket.emit('error', 'Forbidden: Not your tenant');
    }
  });
});
```

---

### 5. ❌ COORDINATES SANITIZATION ABSENTE

**Fichier**: `backend/src/gps-server/parsers/gt06.ts:75-95`, `jt808.ts:54-71`

**Problème**:
```typescript
// GT06
let lat = latRaw / 180000.0;
let lng = lngRaw / 180000.0;

// JT808
const lat = (latRaw * 10) / 1000000;
let lng = (lngRaw * 10) / 1000000;

// ❌ Pas de validation des ranges
// Résultat peut être > 90°, < -90° si données corrompues
```

**Impact**:
- Positions invalides insérées en DB
- Affichage carte cassé (marqueurs hors limites)
- Requêtes géospatiales faussées

**Solution**:
```typescript
// Ajouter dans parsers
const sanitizeCoordinate = (lat: number, lng: number): { lat: number; lng: number } | null => {
    if (lat < -90 || lat > 90) {
        logger.warn(`Invalid latitude: ${lat}`);
        return null;
    }
    if (lng < -180 || lng > 180) {
        logger.warn(`Invalid longitude: ${lng}`);
        return null;
    }
    // Anti-drift: Si coordonnées = 0,0 (golfe de Guinée), probable erreur GPS
    if (lat === 0 && lng === 0) {
        logger.warn('GPS fix lost (0,0)');
        return null;
    }
    return { lat, lng };
};

// Dans parse()
const coords = sanitizeCoordinate(lat, lng);
if (!coords) return null;

return {
    imei: imei,
    latitude: coords.lat,
    longitude: coords.lng,
    // ...
};
```

---

### 6. ❌ MEMORY LEAK - Active Connections Map

**Fichier**: `backend/src/gps-server/server.ts:28`

**Problème**:
```typescript
export const activeConnections = new Map<string, net.Socket>();

// Ajout
if (parsedData.imei) {
    activeConnections.set(parsedData.imei, socket);
}

// Suppression partielle
socket.on('end', () => {
    for (const [imei, s] of activeConnections.entries()) {
        if (s === socket) activeConnections.delete(imei);
    }
});
```

**Vulnérabilité**:
1. **Memory leak si tracker change d'IMEI**:
   - IMEI 'A' se connecte → Map['A'] = socket1
   - IMEI 'B' se connecte sur même socket → Map['B'] = socket1
   - Map['A'] n'est jamais supprimé

2. **Itération O(n) sur chaque déconnexion**:
   - 10 000 trackers connectés
   - Déconnexion = parcourir 10 000 entrées

**Solution**:
```typescript
// Utiliser Map inverse pour O(1) cleanup
const activeConnections = new Map<string, net.Socket>();
const socketToImei = new WeakMap<net.Socket, string>(); // Auto-GC

socket.on('data', async (data) => {
    // ...
    if (parsedData.imei) {
        // Supprimer ancien IMEI si socket réutilisé
        const oldImei = socketToImei.get(socket);
        if (oldImei && oldImei !== parsedData.imei) {
            activeConnections.delete(oldImei);
        }
        
        activeConnections.set(parsedData.imei, socket);
        socketToImei.set(socket, parsedData.imei);
    }
});

socket.on('end', () => {
    const imei = socketToImei.get(socket);
    if (imei) {
        activeConnections.delete(imei);
    }
    // WeakMap auto-cleanup socket
});
```

---

## 🟡 MOYENS (À Corriger Court Terme)

### 7. ⚠️ CACHE REDIS NON ROBUSTE

**Fichier**: `backend/src/services/cacheService.ts:33-40`

```typescript
redis.on('error', (err) => {
    logger.error(`[Redis] Connection error: ${err.message}`);
});
// ❌ Mais pas de fallback si Redis down
```

**Problème**:
Si Redis crash, `CacheService.getVehicleByImei()` throw exception → GPS pipeline s'arrête.

**Solution**:
```typescript
static async getVehicleByImei(imei: string): Promise<CachedVehicle | null> {
    let cached = null;
    
    try {
        const r = getRedis();
        cached = await r.get(cacheKey);
    } catch (err) {
        logger.warn(`[Cache] Redis unavailable, falling back to DB`);
        metrics.cacheErrors.inc();
        // Continue vers DB fallback
    }
    
    if (cached) {
        return JSON.parse(cached);
    }
    
    // Toujours fallback DB
    const result = await pool.query(/* ... */);
}
```

---

### 8. ⚠️ BUFFER OVERFLOW INSUFFISANT

**Fichier**: `backend/src/services/positionBuffer.ts:67-71`

```typescript
if (this.buffer.length >= this.MAX_BUFFER_SIZE) {
    logger.warn(`Buffer overflow, forcing flush`);
    this.flush(); // ❌ Asynchrone, pas de await
}
```

**Problème**:
- `flush()` est async mais pas awaited
- Si flush rate < insert rate, buffer continue de croître
- Peut atteindre des Go de RAM

**Solution**:
```typescript
if (this.buffer.length >= this.MAX_BUFFER_SIZE) {
    logger.warn(`Buffer overflow (${this.buffer.length}), blocking new inserts until flush`);
    await this.flush(); // ✅ Bloquer jusqu'à flush complet
    
    // Ou rejeter nouvelles positions
    if (this.buffer.length >= this.MAX_BUFFER_SIZE * 1.5) {
        logger.error(`CRITICAL: Buffer full, dropping position`);
        return; // Drop
    }
}
```

---

### 9. ⚠️ SOCKET TIMEOUT TROP LONG

**Fichier**: `backend/src/gps-server/server.ts:37`

```typescript
socket.setTimeout(60000); // 60 seconds
```

**Problème**:
- 60 secondes = trop long pour un tracker GPS (devrait envoyer data chaque 10-30s)
- Slowloris attack possible : ouvrir 10 000 connexions idle pendant 60s chacune

**Solution**:
```typescript
socket.setTimeout(30000); // 30 secondes max
socket.setKeepAlive(true, 10000); // Keepalive à 10s

// Ajouter heartbeat detection
let lastActivity = Date.now();

socket.on('data', async (data) => {
    lastActivity = Date.now();
    // ...
});

// Check periodique
const heartbeatCheck = setInterval(() => {
    if (Date.now() - lastActivity > 45000) {
        logger.warn('No data for 45s, closing connection');
        socket.end();
    }
}, 15000);

socket.on('close', () => {
    clearInterval(heartbeatCheck);
});
```

---

### 10. ⚠️ MISSING INDEX TimescaleDB

**Fichier**: Database schema (implicite)

**Problème**:
Requêtes positions par vehicle_id peuvent être lentes si pas d'index correct.

**Vérification Requise**:
```sql
-- Vérifier index existants
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'positions';
```

**Index Recommandés**:
```sql
-- Index composite pour requêtes fréquentes
CREATE INDEX CONCURRENTLY idx_positions_vehicle_time 
ON positions (vehicle_id, time DESC);

-- Index pour requêtes géospatiales
CREATE INDEX CONCURRENTLY idx_positions_geo 
ON positions USING GIST (ll_to_earth(latitude, longitude));

-- Vérifier compression TimescaleDB
SELECT * FROM timescaledb_information.compression_settings 
WHERE hypertable_name = 'positions';

-- Activer compression si pas déjà fait
ALTER TABLE positions SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'vehicle_id'
);

SELECT add_compression_policy('positions', INTERVAL '7 days');
```

---

## 🟢 OPTIMISATIONS

### 11. Performance - Parser Protocol Detection

**Fichier**: `backend/src/gps-server/server.ts:65-76`

**Problème actuel**:
```typescript
// Teste tous les parsers à chaque paquet
for (const parser of parsers) {
    if (parser.canParse(data)) {
        parsedData = parser.parse(data);
        break;
    }
}
```

**Optimisation**:
- Déjà implémenté : Session sticky avec `socketProtocolMap`
- ✅ Bon pattern

**Amélioration supplémentaire**:
```typescript
// Réorganiser parsers par popularité (plus utilisé en premier)
const parsers = [
    new GT06Parser(),        // Le plus courant
    new TextExtendedParser(),
    new JT808Parser(),
    new TextProtocolParser()  // Legacy
];
```

---

### 12. Architecture - Separate GPS Server Process

**Recommandation**:
Actuellement GPS server tourne dans le même process que l'API REST.

**Problème**:
- Si GPS server crash (buffer overflow), API REST crash aussi
- Scaling: impossible de scaler GPS indépendamment

**Solution**:
1. Créer `backend/src/gps-server/standalone.ts`:
```typescript
import { startGpsServer } from './server';
import logger from '../utils/logger';

// Process dédié GPS
startGpsServer();

process.on('SIGTERM', () => {
    logger.info('GPS Server shutting down...');
    process.exit(0);
});
```

2. Modifier `docker-compose.yml`:
```yaml
services:
  backend:
    # API REST only
    command: npm start
  
  gps-server:
    build: ./backend
    command: node dist/gps-server/standalone.js
    ports:
      - "5000:5000"
    depends_on:
      - postgres
      - redis
```

---

### 13. Monitoring - Add GPS Metrics

**Fichier**: Déjà en place dans `server.ts` (lignes 17, 92-94)

**Points positifs**:
```typescript
✅ metrics.gpsActiveConnections.inc()
✅ metrics.gpsProcessingLatency.observe()
✅ metrics.recordGpsMessage()
```

**Métriques manquantes**:
```typescript
// À ajouter dans metricsService.ts
export const gpsInvalidCoordinates = new Counter({
    name: 'gps_invalid_coordinates_total',
    help: 'GPS packets with invalid coordinates'
});

export const gpsRateLimitExceeded = new Counter({
    name: 'gps_rate_limit_exceeded_total',
    help: 'GPS packets blocked by rate limiting',
    labelNames: ['imei']
});

export const gpsCacheHitRate = new Gauge({
    name: 'gps_cache_hit_rate',
    help: 'Redis cache hit rate for IMEI lookups'
});
```

---

## TESTS RECOMMANDÉS

### Test 1: GPS Spoofing avec IMEI invalide
```bash
# Envoyer paquet GT06 avec IMEI inexistant
echo -n "78780A01867584038479810D0A" | nc trackyugps.com 5000

# Vérifier logs
ssh root@148.230.126.62 "docker logs trackyu-gps_backend_1 | grep 'UNKNOWN DEVICE'"
```

### Test 2: WebSocket Tenant Bypass
```javascript
// Tester isolation WebSocket
const io = require('socket.io-client');
const socket = io('https://trackyugps.com');

socket.on('connect', () => {
  // Essayer de rejoindre tenant d'un autre user
  socket.emit('join:tenant', 'tenant-victim');
  
  socket.on('vehicle:update', (data) => {
    console.log('❌ VULN: Received data from other tenant:', data);
  });
});
```

### Test 3: SQL Injection Coordinates
```bash
curl -X POST https://trackyugps.com/api/vehicles/{vehicleId}/position \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "lat": 999,
    "lng": "DROP TABLE positions--",
    "speed": -1000
  }'
# Vérifier rejection
```

### Test 4: Rate Limiting GPS
```bash
# Simuler 1000 paquets/seconde avec IMEI inconnu
for i in {1..1000}; do
  echo "FAKE_IMEI_$i" | nc trackyugps.com 5000 &
done

# Vérifier métriques Prometheus
curl http://148.230.126.62:9090/metrics | grep gps_rate_limit
```

### Test 5: Buffer Overflow
```bash
# Désactiver flush periodique (test local)
# Envoyer 10 000 positions rapidement
node backend/tests/load-test-gps.ts 10000

# Vérifier RAM usage
docker stats trackyu-gps_backend_1
```

---

## CHECKLIST DE CORRECTION

### Priorité 1 - URGENT (Cette semaine)
- [ ] **#4** - WebSocket Auth JWT obligatoire
- [ ] **#1** - Parser IMEI dans GT06
- [ ] **#3** - Validation coordinates + tenant_id dans updatePosition

### Priorité 2 - IMPORTANT (Ce mois)
- [ ] **#2** - Rate limiting par IMEI inconnus
- [ ] **#5** - Sanitization coordinates dans parsers
- [ ] **#6** - Fix memory leak activeConnections

### Priorité 3 - AMÉLIORATIONS (Trimestre)
- [ ] **#7** - Redis fallback robuste
- [ ] **#8** - Buffer await flush on overflow
- [ ] **#9** - Socket timeout 30s
- [ ] **#10** - Index TimescaleDB vérification
- [ ] **#12** - Séparer GPS server process
- [ ] **#13** - Métriques GPS complètes

---

## RECOMMANDATIONS ARCHITECTURE

### 1. Implémenter Device Registration Flow
Actuellement, les trackers peuvent envoyer data sans Login préalable.

**Flow recommandé**:
```
1. Tracker connect → TCP socket ouvert
2. Serveur attend paquet LOGIN (0x01 pour GT06)
3. Si Login valide (IMEI reconnu) → OK
4. Si Login invalide → Close socket
5. Mémoriser IMEI dans socketImeiMap
6. Accepter paquets Location (0x22) uniquement si Login OK
```

### 2. Ajouter Table `gps_sessions`
```sql
CREATE TABLE gps_sessions (
  imei VARCHAR(20) PRIMARY KEY,
  socket_id VARCHAR(50),
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  packets_count INT DEFAULT 0,
  protocol VARCHAR(20)
);
```

Utilité:
- Monitoring connexions actives
- Détection anomalies (même IMEI depuis 2 IPs)
- Rate limiting par IMEI
- Audit trail

### 3. Implémenter Command Queue
Pour envoyer commandes aux trackers (immobilisation, reset, config).

**Fichier**: `backend/src/gps-server/commandFactory.ts` (déjà existant!)

**Amélioration**:
```typescript
// Ajouter queue Redis pour commandes asynchrones
import Bull from 'bull';

const commandQueue = new Bull('gps-commands', process.env.REDIS_URL);

commandQueue.process(async (job) => {
  const { imei, command } = job.data;
  const socket = activeConnections.get(imei);
  
  if (!socket) {
    throw new Error('Device offline');
  }
  
  socket.write(command);
});

// API pour envoyer commande
router.post('/devices/:imei/command', async (req, res) => {
  await commandQueue.add({ imei: req.params.imei, command: req.body.command });
  res.json({ status: 'queued' });
});
```

---

## CONCLUSION

Le module GPS/Map présente des **vulnérabilités critiques** nécessitant une action immédiate:

### Risques Majeurs Identifiés:
1. ❌ Spoofing GPS (IMEI hardcodé GT06)
2. ❌ Fuite données tenant (WebSocket sans auth)
3. ❌ DoS possible (pas rate limiting IMEI)

### Points Positifs:
✅ Buffer batch INSERT implémenté  
✅ Cache Redis pour performance  
✅ Métriques Prometheus en place  
✅ Throttling WebSocket  

### Actions Immédiates:
1. Implémenter WebSocket JWT auth (2h)
2. Parser IMEI GT06 correctement (4h)
3. Ajouter validation coordinates (2h)
4. Rate limiting IMEI invalides (3h)

**Estimation effort total corrections critiques**: 2-3 jours développeur.

---

**Rapport généré le**: 2026-02-03  
**Prochaine revue recommandée**: Après corrections (dans 1 semaine)
