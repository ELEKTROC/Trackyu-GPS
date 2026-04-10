# 🔐 Sécurité

## Architecture de Sécurité

Le backend implémente **7 couches de protection** :

| Couche | Technologie | Fichier |
|--------|-------------|---------|
| **HTTPS** | Caddy (reverse proxy) | Production uniquement |
| **Helmet** | Headers sécurisés | `/backend/src/index.ts` |
| **CORS** | Origines autorisées | `/backend/src/index.ts` |
| **Rate Limiting** | express-rate-limit | `/backend/src/middleware/rateLimiter.ts` |
| **JWT** | jsonwebtoken | `/backend/src/middleware/authMiddleware.ts` |
| **Hashing** | bcryptjs (salt 10) | `/backend/src/controllers/authController.ts` |
| **RBAC** | Permissions granulaires | `/backend/src/middleware/authMiddleware.ts` |

## 🚦 Rate Limiting

```typescript
// Authentification : 5 tentatives / 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,
  message: 'Too many login attempts, please try again later'
});

// API générale : 100 requêtes / minute
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,       // 1 minute
  max: 100,
  skip: (req) => req.path === '/api/health'  // Skip health checks
});
```

## 🎫 Authentification JWT

### Structure du Token

```typescript
// Payload JWT
{
  userId: string,      // ID utilisateur
  email: string,       // Email
  role: string,        // Rôle (ADMIN, USER, etc.)
  tenantId: string,    // ID tenant (isolation)
  permissions: string[], // ['VIEW_FLEET', 'CREATE_INVOICE', ...]
  iat: number,         // Issued at
  exp: number          // Expiration (24h par défaut)
}
```

### Vérification

```typescript
// middleware/authMiddleware.ts
export const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};
```

## 🔑 Hashing des Mots de Passe

```typescript
import bcrypt from 'bcryptjs';

// ✅ Création d'un hash
const salt = await bcrypt.genSalt(10);
const hash = await bcrypt.hash(password, salt);

// ✅ Vérification
const isValid = await bcrypt.compare(password, user.password_hash);

// ❌ JAMAIS stocker en clair
INSERT INTO users (password) VALUES ('motdepasse'); // INTERDIT!
```

## 🛡️ RBAC (Role-Based Access Control)

### Permissions Disponibles

```typescript
// Types de permissions (voir /types.ts)
type Permission =
  // Fleet
  | 'VIEW_FLEET' | 'CREATE_VEHICLE' | 'EDIT_VEHICLE' | 'DELETE_VEHICLE'
  // CRM
  | 'VIEW_CRM' | 'CREATE_LEAD' | 'EDIT_LEAD' | 'DELETE_LEAD'
  // Finance
  | 'VIEW_FINANCE' | 'CREATE_INVOICE' | 'EDIT_INVOICE' | 'DELETE_INVOICE'
  // Admin
  | 'VIEW_ADMIN' | 'MANAGE_USERS' | 'MANAGE_TENANTS' | 'MANAGE_ROLES'
  // ...
```

### Middleware de Permission

```typescript
// middleware/authMiddleware.ts
export const requirePermission = (permission: string) => {
  return (req, res, next) => {
    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    next();
  };
};

// Usage dans les routes
router.delete('/:id', 
  authenticateToken, 
  requirePermission('DELETE_VEHICLE'), 
  vehicleController.delete
);
```

### Vérification Frontend

```typescript
// Hook useAuth
const { hasPermission } = useAuth();

// Dans un composant
{hasPermission('DELETE_VEHICLE') && (
  <button onClick={handleDelete}>Supprimer</button>
)}
```

## ✅ Bonnes Pratiques

### À FAIRE

```typescript
// 1. Toujours valider les entrées avec Zod
const result = Schema.safeParse(req.body);
if (!result.success) {
  return res.status(400).json({ error: 'Invalid input' });
}

// 2. Requêtes SQL paramétrées (anti-injection)
db.query('SELECT * FROM users WHERE id = $1', [userId]); // ✅

// 3. Vérifier les permissions avant toute action
if (!req.user.permissions.includes('DELETE_VEHICLE')) {
  return res.status(403).json({ error: 'Forbidden' });
}

// 4. Logger les actions sensibles
AuditService.log({
  action: 'DELETE',
  entityType: 'user',
  entityId: userId,
  userId: req.user.id,
  details: { reason: 'Admin request' }
});

// 5. Filtrer par tenant_id
const data = await db.query(
  'SELECT * FROM vehicles WHERE tenant_id = $1',
  [req.user.tenantId]
);
```

### À NE JAMAIS FAIRE ❌

```typescript
// 1. SQL injection
db.query(`SELECT * FROM users WHERE id = '${userId}'`); // ❌ DANGER!

// 2. Secrets dans le code
const API_KEY = 'sk_live_xxx'; // ❌ Utiliser process.env

// 3. Mots de passe en clair
INSERT INTO users (password) VALUES ('motdepasse'); // ❌

// 4. CORS permissif en production
app.use(cors({ origin: '*' })); // ❌

// 5. Logger des données sensibles
console.log('User password:', password); // ❌ JAMAIS
logger.info('Token:', jwt); // ❌ JAMAIS
```

## 🔒 Variables d'Environnement

Ces variables doivent être dans `.env` (jamais committées) :

```bash
# Critique - Sécurité
JWT_SECRET=votre_secret_32_caracteres_minimum
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://localhost:6379

# Intégrations externes
ORANGE_SMS_CLIENT_ID=xxx
ORANGE_SMS_CLIENT_SECRET=xxx
WAVE_API_KEY=xxx
TELEGRAM_BOT_TOKEN=xxx
RESEND_API_KEY=xxx
```

## ✔️ Checklist Sécurité Déploiement

- [ ] `.env` non commité (vérifier `.gitignore`)
- [ ] `JWT_SECRET` unique et fort (32+ caractères aléatoires)
- [ ] CORS configuré avec domaines spécifiques
- [ ] Rate limiting activé sur toutes les routes
- [ ] HTTPS activé (Caddy avec certificat Let's Encrypt)
- [ ] Mots de passe hashés avec bcrypt (salt 10)
- [ ] Toutes les requêtes SQL sont paramétrées
- [ ] Permissions RBAC sur toutes les routes sensibles
- [ ] Headers de sécurité activés (Helmet)
- [ ] Logs ne contiennent pas de données sensibles

## 🔍 Audit Trail

```typescript
// Service d'audit pour tracer les actions
import { AuditService } from '../services/AuditService';

// Logger une action
AuditService.log({
  userId: req.user.id,
  action: 'DELETE',          // CREATE | UPDATE | DELETE | LOGIN | LOGOUT
  entityType: 'vehicle',     // Type d'entité
  entityId: vehicleId,       // ID de l'entité
  tenantId: req.user.tenantId,
  details: {
    reason: 'Véhicule vendu',
    previousValue: oldVehicle
  }
});

// Consulter l'historique
GET /api/audit?entityType=vehicle&entityId=xxx
```

## � Audits de Sécurité Réalisés (Fév 2026)

**16 audits complétés, ~250+ issues corrigées :**

| Module | CRITICAL | HIGH | MEDIUM | Déployé |
|--------|----------|------|--------|--------|
| Factures/Finance | 8 | 21 | 18 | 09/02 |
| Tickets/Support | 5 | 12 | 8 | 09/02 |
| Interventions | 4 | 8 | 6 | 09/02 |
| Administration | 10 | 6 | 11 | 09/02 |
| Stock/Matériel | 6 | 3 | 2 | 10/02 |
| Prévente/CRM | 11 | 3 | 7 | 10/02 |
| Vente/Finance | 13 | 5 | 19 | 10/02 |
| Comptabilité | 5 | 5 | 7 | 10/02 |
| Dashboard | 3 | 2 | 2 | 09/02 |
| Agenda | 2 | 1 | 2 | 09/02 |
| Carte en Direct | 3 | 4 | 4 | 11/02 |
| Véhicules | 6 | 3 | 4 | 11/02 |
| Rapports | 2 | 3 | 3 | 10/02 |
| Paramètres | 3 | 3 | 5 | 09/02 |
| Monitoring | 4 | 3 | 3 | 09/02 |
| Responsive UI | 2 | 6 | 7 | 11/02 |

### Types de corrections appliquées
- **RBAC** : `requirePermission()` ajouté sur 100+ routes non protégées
- **Tenant isolation** : `tenant_id` filtré dans toutes les requêtes
- **IDOR** : Vérification propriété avant accès cross-tenant
- **SQL injection** : Requêtes paramétrées (intervalles, colonnes)
- **Logging** : 200+ `console.log/error` → `logger.error` ou supprimés
- **Tenant spoofing** : `req.body.tenantId` remplacé par `req.user.tenantId`
- **`isStaffUser()`** : Pattern standard pour bypass SuperAdmin
|---------|---------------|------------|
| `userController.ts` | Email non unique globalement | Vérification globale avant création |
| `userController.ts` | UPDATE/DELETE sans filtre tenant | Ajout filtre `tenant_id` |
| `vehicleController.ts` | GPS sans vérification propriété | Ajout check `tenant_id` sur device |
| `vehicleController.ts` | SQL injection tri colonnes | Whitelist colonnes autorisées |
| `ticketController.ts` | SUPER_ADMIN ne peut pas voir cross-tenant | Bypass tenant_id pour SUPER_ADMIN |
| `leadController.ts` | Doublons leads possibles | Détection backend email+company |
| `financeRoutes.ts` | Routes DELETE sans RBAC | Ajout `requirePermission()` |
| `tierRoutes.ts` | Validation Zod manquante | Ajout middleware validation |
| `socket.ts` | WebSocket sans auth | Vérification JWT à la connexion |
| `gt06.ts` | Variable IMEI non déclarée | Extraction correcte de l'IMEI |

### Index de Sécurité Ajoutés

```sql
-- Contraintes d'unicité
CREATE UNIQUE INDEX idx_devices_imei_unique ON devices(imei);
CREATE UNIQUE INDEX idx_users_email_unique ON users(email);
CREATE UNIQUE INDEX idx_tenants_slug_unique ON tenants(slug);

-- Index de performance tenant
CREATE INDEX idx_vehicles_tenant ON vehicles(tenant_id);
CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX idx_tiers_tenant ON tiers(tenant_id);
```

### Migration

Fichier : `backend/src/db/migrations/20260203_security_fixes.sql`

---

*Dernière mise à jour : 2026-02-10*
