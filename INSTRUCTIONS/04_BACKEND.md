# ⚙️ Backend Node.js

## Stack Technique

| Technologie | Version | Usage |
|-------------|---------|-------|
| Node.js | 20.x | Runtime |
| Express | 4.x | Framework HTTP |
| PostgreSQL | 16 | Base de données |
| TimescaleDB | 2.x | Extension time-series |
| Redis | 7.x | Cache |
| Socket.IO | 4.x | WebSocket |
| JWT | - | Authentification |
| bcryptjs | - | Hashing |
| Zod | 3.x | Validation |

## 📁 Structure

```
backend/
├── src/
│   ├── index.ts              # Point d'entrée
│   ├── socket.ts             # Configuration Socket.IO
│   │
│   ├── routes/               # 60+ fichiers de routes
│   │   ├── authRoutes.ts
│   │   ├── vehicleRoutes.ts
│   │   ├── invoiceRoutes.ts
│   │   ├── driverRoutes.ts
│   │   ├── branchRoutes.ts
│   │   ├── groupRoutes.ts
│   │   ├── poiRoutes.ts
│   │   ├── alertConfigRoutes.ts
│   │   └── ...
│   │
│   ├── controllers/          # Logique métier
│   │   ├── authController.ts
│   │   ├── vehicleController.ts
│   │   └── ...
│   │
│   // API Endpoints
│   // GPS
│   /api/fleet/positions     GET
│   /api/fleet/trips         GET
│   /api/fleet/alerts        GET
│
│   // Gestion Flotte Avancée [NEW]
│   /api/drivers             GET, POST, PUT, DELETE
│   /api/branches            GET, POST, PUT, DELETE
│   /api/groups              GET, POST, PUT, DELETE
│   /api/pois                GET, POST, PUT, DELETE
│
│   // Configuration [NEW]
│   /api/alert-configs       GET, POST
│   /api/eco-driving-profiles GET, POST
│   /api/schedule-rules      GET, POST
│   /api/maintenance-rules   GET, POST
│
│   // Système
│   /api/health/db           GET        # Health Check Database
│   ├── middleware/           # Middlewares
│   │   ├── authMiddleware.ts # JWT + RBAC
│   │   └── rateLimiter.ts    # Rate limiting
│   │
│   ├── services/             # Services métier
│   │   ├── scheduler.ts      # Tâches planifiées
│   │   ├── automationEngine.ts
│   │   ├── notificationDispatcher.ts
│   │   ├── cacheService.ts
│   │   ├── positionBuffer.ts
│   │   └── AuditService.ts
│   │
│   ├── gps-server/           # Serveur TCP GPS
│   │   ├── server.ts
│   │   └── parsers/          # Protocoles GPS
│   │       ├── gt06.ts
│   │       ├── jt808.ts
│   │       └── textProtocol.ts
│   │
│   └── db/
│       ├── pool.ts           # Connection pool
│       └── migrations/       # Migrations SQL
│
├── migrations/               # Migrations (racine)
└── package.json
```

## 🛤️ Pattern des Routes

```typescript
// Structure standard pour toutes les routes
import { Router } from 'express';
import { authenticateToken, requirePermission } from '../middleware/authMiddleware';
import * as controller from '../controllers/vehicleController';

const router = Router();

// Liste avec pagination
router.get('/', 
  authenticateToken, 
  requirePermission('VIEW_FLEET'), 
  controller.list
);

// Détail
router.get('/:id', 
  authenticateToken, 
  requirePermission('VIEW_FLEET'), 
  controller.getById
);

// Création
router.post('/', 
  authenticateToken, 
  requirePermission('CREATE_VEHICLE'), 
  controller.create
);

// Mise à jour
router.put('/:id', 
  authenticateToken, 
  requirePermission('EDIT_VEHICLE'), 
  controller.update
);

// Suppression
router.delete('/:id', 
  authenticateToken, 
  requirePermission('DELETE_VEHICLE'), 
  controller.delete
);

export default router;
```

## 🎯 Pattern des Controllers

```typescript
// controllers/vehicleController.ts
import { Request, Response } from 'express';
import pool from '../db/pool';
import { VehicleSchema } from '../schemas/vehicleSchema';

export const list = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user.tenantId;  // ⚠️ TOUJOURS filtrer par tenant
    
    const result = await pool.query(
      'SELECT * FROM vehicles WHERE tenant_id = $1 ORDER BY name',
      [tenantId]
    );
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    // 1. Valider avec Zod
    const validation = VehicleSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ errors: validation.error.flatten() });
    }
    
    const { name, plate, deviceId } = validation.data;
    const tenantId = req.user.tenantId;
    
    // 2. Vérifier les doublons
    const existing = await pool.query(
      'SELECT id FROM vehicles WHERE plate = $1 AND tenant_id = $2',
      [plate, tenantId]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Vehicle with this plate already exists' });
    }
    
    // 3. Insérer
    const result = await pool.query(
      'INSERT INTO vehicles (name, plate, device_id, tenant_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, plate, deviceId, tenantId]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
```

## 📋 Services Backend

### Scheduler (`scheduler.ts`)

```typescript
// Tâches automatiques en arrière-plan
import cron from 'node-cron';

// Toutes les heures - Automations CRM
cron.schedule('0 * * * *', () => {
  automationEngine.processAll();
});

// Toutes les 6 heures - Recouvrement
cron.schedule('0 */6 * * *', () => {
  recoveryService.processOverdueInvoices();
});

// Quotidien à 2h - Nettoyage
cron.schedule('0 2 * * *', () => {
  cleanupService.deleteOldLogs();
});
```

### AutomationEngine (`automationEngine.ts`)

```typescript
// Triggers CRM automatiques
const triggers = [
  'LEAD_CREATED',
  'QUOTE_SENT',
  'INVOICE_OVERDUE',
  'CONTRACT_EXPIRING',
  'PAYMENT_RECEIVED'
];

const actions = [
  'CREATE_TASK',
  'SEND_EMAIL',
  'SEND_SMS',
  'SEND_TELEGRAM',
  'UPDATE_STATUS'
];

// Exemple d'automation
{
  trigger: 'INVOICE_OVERDUE',
  conditions: { daysOverdue: 7 },
  actions: [
    { type: 'SEND_SMS', template: 'invoice_reminder' },
    { type: 'CREATE_TASK', assignTo: 'accountant' }
  ]
}
```

### NotificationDispatcher (`notificationDispatcher.ts`)

```typescript
// Envoi unifié multi-canal
await notificationDispatcher.send({
  channel: 'SMS',  // 'EMAIL' | 'SMS' | 'TELEGRAM' | 'WHATSAPP' | 'PUSH'
  sms: {
    to: '+225XXXXXXXXXX',
    message: 'Alerte véhicule'
  },
  tenantId: 'xxx'
});

// Ou multi-canal
await notificationDispatcher.sendMulti({
  channels: ['SMS', 'EMAIL', 'TELEGRAM'],
  // ...
});
```

### AuditService (`AuditService.ts`)

```typescript
// Journalisation des actions sensibles
import { AuditService } from '../services/AuditService';

AuditService.log({
  userId: req.user.id,
  action: 'DELETE',          // CREATE | UPDATE | DELETE
  entityType: 'vehicle',
  entityId: vehicleId,
  tenantId: req.user.tenantId,
  details: { reason: 'Véhicule vendu' }
});
```

## 🗄️ Accès Base de Données

### Connection Pool

```typescript
// db/pool.ts
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000
});

export default pool;
```

### Requêtes Paramétrées

```typescript
// ✅ TOUJOURS utiliser des requêtes paramétrées
const result = await pool.query(
  'SELECT * FROM users WHERE email = $1 AND tenant_id = $2',
  [email, tenantId]
);

// ❌ JAMAIS de concaténation de strings
const result = await pool.query(
  `SELECT * FROM users WHERE email = '${email}'`  // SQL INJECTION!
);
```

## 📡 WebSocket (Socket.IO)

```typescript
// socket.ts
import { Server } from 'socket.io';

let io: Server;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: process.env.CORS_ORIGINS.split(',') }
  });
  
  io.on('connection', (socket) => {
    socket.on('join:tenant', (tenantId) => {
      socket.join(`tenant:${tenantId}`);
    });
  });
};

export const getIO = () => io;

// Émettre vers un tenant
getIO().to(`tenant:${tenantId}`).emit('vehicle:update', payload);
```

## 🧪 Tests

| Métrique | Valeur |
|----------|--------|
| **Runner** | Jest 30.2 + ts-jest 29.4 |
| **Tests pass** | 78/78 (100%) |
| **Config** | `jest.config.ts` + `tests/setup.ts` |
| **Mocks** | pg Pool, ioredis, winston logger |

### Fichiers de tests

| Fichier | Tests | Couverture |
|---------|-------|------------|
| `tests/utils.test.ts` | 3 | Utilitaires |
| `tests/auth.test.ts` | 40 | authenticateToken, requirePermission, requireAdmin, requireRole, isStaffUser |
| `tests/tenant-isolation.test.ts` | 35 | auditTenantFilter, buildTenantFilter, addTenantCondition, impersonation, canAccessTenant |

```bash
# Exécuter les tests
cd backend && npx jest --verbose

# Tests de charge GPS
npm run load-test:100   # 100 appareils simulés
npm run load-test:1000  # 1000 appareils simulés
```

### CI/CD

Les tests backend sont exécutés automatiquement dans GitHub Actions (`.github/workflows/ci.yml`, job `backend`).

## 📦 Commandes

```bash
# Développement
cd backend
npm run dev           # Hot reload avec nodemon

# Build
npm run build         # Compile avec esbuild

# Base de données
npm run db:migrate    # Exécuter les migrations

# Production
npm start             # Démarrer le serveur
```

## 🧪 Environnement Staging

```bash
# Backend staging
docker logs -f staging_backend

# Accès DB staging
docker exec -it staging_postgres psql -U fleet_user -d fleet_db_staging

# Redémarrer staging
docker restart staging_backend
```

| Service | Port Production | Port Staging |
|---------|-----------------|---------------|
| Backend API | 3001 | 3002 |
| GPS Server | 5001 | 5002 |
| PostgreSQL | 5432 | 5433 |
| Redis | 6379 | 6380 |

## 💾 Sauvegardes

```bash
# Script automatique : scripts/backup-db.sh
./scripts/backup-db.sh daily    # Sauvegarde quotidienne
./scripts/backup-db.sh weekly   # Sauvegarde hebdomadaire
./scripts/backup-db.sh manual   # Sauvegarde manuelle

# Cron recommandé (production)
0 2 * * * /var/www/trackyu-gps/scripts/backup-db.sh daily
0 3 * * 0 /var/www/trackyu-gps/scripts/backup-db.sh weekly
```

Rétention : 7 daily, 4 weekly, 10 manual.

## 📄 Fichier `.env.example`

Un template `.env.example` est fourni à la racine du projet pour documenter toutes les variables d'environnement nécessaires (DB, JWT, intégrations SMS/Wave/Telegram).

---

*Dernière mise à jour : 2026-02-10*
