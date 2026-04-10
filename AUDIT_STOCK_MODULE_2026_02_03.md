# 🔍 AUDIT SÉCURITÉ - MODULE STOCK/INVENTAIRE
## TrackYu GPS - 3 février 2026

---

## 📊 SCORE GLOBAL : **45/100** ⚠️ CRITIQUE

| Catégorie | Score | État |
|-----------|-------|------|
| **Isolation tenant_id** | 40/100 | 🔴 CRITIQUE |
| **RBAC Permissions** | 0/100 | 🔴 ABSENT |
| **Validation Données** | 70/100 | 🟡 MOYEN |
| **Logique Métier** | 30/100 | 🔴 CRITIQUE |
| **Traçabilité** | 60/100 | 🟡 MOYEN |

---

## 🔴 VULNÉRABILITÉS CRITIQUES

### 1. **ISOLATION TENANT_ID - FAILLES MAJEURES**

#### **catalogRoutes.ts - Ligne 12-32 : GLOBAL ACCESS NON SÉCURISÉ**
```typescript
// ❌ FAILLE CRITIQUE
const hasGlobalAccess = user?.role === 'SUPERADMIN' || tenantId === 'trackyu';

if (!hasGlobalAccess) {
  query += ' WHERE c.tenant_id = $1';
  params.push(tenantId);
}
```

**PROBLÈMES** :
- ✅ Filtrage conditionnel par `tenant_id` pour utilisateurs normaux
- ❌ **FAILLE** : Hardcoded tenant 'trackyu' pour accès global
- ❌ Pas de vérification de la permission `VIEW_ALL_TENANTS`
- ❌ Log excessif exposant la structure de requête

**IMPACT** : Utilisateur du tenant 'trackyu' peut voir TOUS les catalogues

---

#### **stockMovementController.ts - Ligne 6-24 : LOGIQUE TENANT INCOHÉRENTE**
```typescript
// ❌ FAILLE CRITIQUE
if (!isStaffUser(tenantId) && tenantId) {
    query += ' WHERE sm.tenant_id = $1';
    params.push(tenantId);
}
```

**PROBLÈMES** :
- ❌ Fonction `isStaffUser()` non auditée (potentiel bypass)
- ❌ Si `tenantId` est `null/undefined`, AUCUN filtrage appliqué
- ❌ Staff users voient TOUS les mouvements cross-tenant

**IMPACT** : Fuite de données inter-tenants si logique staff mal implémentée

---

#### **stockMovementController.ts - Ligne 32-48 : TENANT ID INJECTION**
```typescript
// ❌ FAILLE CRITIQUE
const { tenantId: bodyTenantId } = req.body;
const userTenantId = req.user?.tenantId;

const tenantId = userTenantId || bodyTenantId; // ⚠️ DANGER!
```

**PROBLÈMES** :
- ❌ **INJECTION TENANT_ID** : Accepte `tenantId` depuis le body
- ❌ Un utilisateur peut forcer `bodyTenantId` à un autre tenant
- ❌ Pas de validation que `bodyTenantId === userTenantId`

**IMPACT** : Utilisateur peut créer des mouvements pour d'autres tenants

**EXPLOIT** :
```bash
# Attaquant du tenant A crée un mouvement pour tenant B
POST /api/stock-movements
{
  "tenantId": "tenant-b-uuid",  # ← Injection!
  "deviceId": "...",
  "type": "OUT"
}
```

---

### 2. **RBAC - PERMISSIONS TOTALEMENT ABSENTES**

#### **catalogRoutes.ts - Aucune Protection**
```typescript
// ❌ CRITIQUE - Aucune permission
router.use(authenticateToken); // Uniquement auth basique

router.get('/', async (req, res) => { ... });      // Pas de requirePermission('VIEW_CATALOG')
router.post('/', async (req, res) => { ... });     // Pas de requirePermission('CREATE_CATALOG')
router.put('/:id', async (req, res) => { ... });   // Pas de requirePermission('EDIT_CATALOG')
router.delete('/:id', async (req, res) => { ... }); // Pas de requirePermission('DELETE_CATALOG')
```

**IMPACT** : N'importe quel utilisateur authentifié peut :
- Créer/modifier/supprimer des articles catalogue
- Affecter des prix arbitraires
- Désactiver des produits critiques

---

#### **stockMovementRoutes.ts - Aucune Protection**
```typescript
// ❌ CRITIQUE - Aucune permission
router.get('/', authenticateToken, getStockMovements);
router.post('/', authenticateToken, validateRequest(StockMovementSchema), createStockMovement);
router.put('/:id', authenticateToken, updateStockMovement);
router.delete('/:id', authenticateToken, deleteStockMovement);
```

**IMPACT** :
- Utilisateurs non autorisés peuvent créer des mouvements
- Sortie de stock sans contrôle
- Manipulation de l'inventaire

**PERMISSIONS MANQUANTES** :
```typescript
// Ce qui DEVRAIT exister :
| 'VIEW_STOCK' 
| 'CREATE_STOCK_MOVEMENT'
| 'EDIT_STOCK_MOVEMENT'
| 'DELETE_STOCK_MOVEMENT'
| 'VALIDATE_STOCK_MOVEMENT'
| 'VIEW_CATALOG'
| 'CREATE_CATALOG'
| 'EDIT_CATALOG'
| 'DELETE_CATALOG'
```

---

### 3. **LOGIQUE MÉTIER - STOCK NÉGATIF AUTORISÉ**

#### **Aucune Vérification de Quantité Disponible**

**stockMovementController.ts - createStockMovement()**
```typescript
// ❌ CRITIQUE - Aucune vérification stock
const result = await pool.query(
  `INSERT INTO stock_movements (...) VALUES (...)`,
  [id, tenantId, deviceId, type, ...]
);
// ⚠️ Pas de vérification :
// - Stock disponible avant sortie (type = 'OUT')
// - Quantité négative interdite
// - Cohérence avec inventaire réel
```

**MANQUE** :
```typescript
// Ce qui DEVRAIT exister :
if (type === 'OUT' || type === 'REMOVAL') {
  // Vérifier stock disponible
  const stockCheck = await pool.query(`
    SELECT 
      COUNT(*) FILTER (WHERE status = 'IN_STOCK') as available,
      COUNT(*) as total
    FROM devices
    WHERE id = $1 AND tenant_id = $2
  `, [deviceId, tenantId]);
  
  if (stockCheck.rows[0].available < quantity) {
    return res.status(400).json({ 
      error: 'Insufficient stock',
      available: stockCheck.rows[0].available,
      requested: quantity
    });
  }
}
```

**IMPACT** : Stock physique et DB peuvent diverger (états fantômes)

---

#### **Pas de Transaction Atomique**

```typescript
// ❌ CRITIQUE - Pas de BEGIN/COMMIT
async createStockMovement(req, res) {
  // 1. INSERT mouvement
  await pool.query('INSERT INTO stock_movements ...');
  
  // 2. UPDATE device status (séparé, non transactionnel!)
  // ⚠️ Si erreur ici, mouvement créé mais device pas mis à jour
}
```

**RISQUE** : Incohérence données si erreur entre étapes

---

### 4. **DOUBLONS - VÉRIFICATION ABSENTE**

#### **catalogRoutes.ts - POST (Ligne 77-89)**
```typescript
// ❌ Aucune vérification unicité
router.post('/', validateRequest(CatalogSchema), async (req, res) => {
  const { name, type, sku, ... } = req.body;
  const id = `CAT-${Date.now()}`;
  
  // ⚠️ Pas de vérification :
  // - SKU unique par tenant
  // - Nom + Type unique
  
  await pool.query(
    'INSERT INTO catalog (...) VALUES (...)',
    [id, name, type, sku, ...]
  );
});
```

**MANQUE** :
```typescript
// Vérifier unicité SKU
const existing = await pool.query(
  'SELECT id FROM catalog WHERE sku = $1 AND tenant_id = $2',
  [sku, tenantId]
);
if (existing.rows.length > 0) {
  return res.status(409).json({ error: 'SKU already exists' });
}
```

**IMPACT** : Articles dupliqués dans le catalogue

---

## 🟡 PROBLÈMES MOYENS

### 5. **VALIDATION ZOD - INCOMPLÈTE**

#### **StockMovementSchema (schemas/index.ts:314-323)**
```typescript
export const StockMovementSchema = z.object({
  itemId: z.string().min(1),
  type: z.enum(['IN', 'OUT', 'TRANSFER', 'ADJUSTMENT']),
  quantity: z.number().min(1), // ✅ Positif imposé
  reason: z.string().optional(),
  reference: z.string().optional(),
  sourceLocation: z.string().optional(),
  destLocation: z.string().optional(),
});
```

**MANQUES** :
- ❌ `tenantId` non validé (laissé au controller - risque injection)
- ❌ `deviceId` non validé comme UUID
- ❌ Pas de validation conditionnelle :
  - TRANSFER doit avoir `sourceLocation` ET `destLocation`
  - OUT doit avoir `reason` obligatoire

**AMÉLIORATION** :
```typescript
export const StockMovementSchema = z.object({
  itemId: z.string().uuid(),
  type: z.enum(['IN', 'OUT', 'TRANSFER', 'ADJUSTMENT']),
  quantity: z.number().int().positive(),
  reason: z.string().optional(),
  reference: z.string().optional(),
  sourceLocation: z.string().optional(),
  destLocation: z.string().optional(),
}).refine((data) => {
  if (data.type === 'TRANSFER') {
    return !!data.sourceLocation && !!data.destLocation;
  }
  return true;
}, {
  message: "Transfer requires source and destination locations"
});
```

---

#### **CatalogSchema (schemas/index.ts:481-491)**
```typescript
export const CatalogSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['DEVICE', 'ACCESSORY', 'SERVICE', 'SIM', 'SUBSCRIPTION']),
  sku: z.string().optional(), // ❌ SKU devrait être unique
  description: z.string().optional(),
  purchasePrice: z.number().min(0).optional().default(0),
  sellingPrice: z.number().min(0), // ✅ Prix vente obligatoire
  taxRate: z.number().min(0).max(100).optional().default(18),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE'),
});
```

**MANQUES** :
- ❌ Pas de validation `sellingPrice >= purchasePrice`
- ❌ `sku` devrait être obligatoire pour produits physiques
- ❌ Pas de limite max sur `sellingPrice` (anti-erreur de saisie)

---

### 6. **TRAÇABILITÉ - PARTIELLE**

#### **✅ BON - AuditLog Extension**
```typescript
// stockMovementControllerExtensions.ts - Ligne 133-145
export const validateStockMovement = async (req, res) => {
  await pool.query(`
    UPDATE stock_movements
    SET 
      validated_at = NOW(),
      validated_by = $1  // ✅ Traçage validateur
    WHERE id = $2
  `, [userId, id]);
}
```

#### **❌ MANQUANT - Actions Non Tracées**
- Créations catalogue sans `created_by`
- Suppressions mouvements sans audit log
- Modifications prix sans historique

---

### 7. **SOFT DELETE - INCONSISTANT**

#### **stockMovementControllerExtensions.ts - Ligne 115-129**
```typescript
// ✅ BON - Soft delete implémenté
await pool.query(`
  UPDATE stock_movements
  SET deleted_at = NOW()
  WHERE id = $1
`, [id]);
```

#### **catalogRoutes.ts - Ligne 112-127**
```typescript
// ❌ HARD DELETE - Perte données
await pool.query(
  'DELETE FROM catalog WHERE id = $1 AND tenant_id = $2',
  [id, tenantId]
);
```

**RECOMMANDATION** : Soft delete partout

---

## 🟢 POINTS POSITIFS

### 1. **Validation Zod Activée**
✅ `validateRequest(StockMovementSchema)` sur POST routes
✅ Quantités positives imposées
✅ Types énumérés (IN/OUT/TRANSFER)

### 2. **Tenant_id dans Requêtes Principales**
✅ `catalogRoutes.ts` GET by ID (ligne 65)
✅ `stockMovementController.ts` getById (ligne 76)

### 3. **Schéma DB Cohérent**
✅ Index sur `tenant_id` (catalog, stock_movements)
✅ Foreign Keys vers `tenants`, `users`, `devices`

---

## 📋 PLAN DE CORRECTION PRIORITAIRE

### 🔴 URGENT (24h)

#### **1. Fixer Injection tenant_id**
```typescript
// backend/src/controllers/stockMovementController.ts
export const createStockMovement = async (req, res) => {
  const tenantId = req.user?.tenantId; // ✅ UNIQUEMENT depuis JWT
  const userId = req.user?.id;
  
  // ❌ SUPPRIMER :
  // const { tenantId: bodyTenantId } = req.body;
  // const tenantId = userTenantId || bodyTenantId;
  
  if (!tenantId || !userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // ... suite
}
```

#### **2. Ajouter RBAC sur Toutes Routes**
```typescript
// backend/src/routes/catalogRoutes.ts
import { requirePermission } from '../middleware/authMiddleware';

router.get('/', authenticateToken, requirePermission('VIEW_CATALOG'), ...);
router.post('/', authenticateToken, requirePermission('CREATE_CATALOG'), validateRequest(...), ...);
router.put('/:id', authenticateToken, requirePermission('EDIT_CATALOG'), ...);
router.delete('/:id', authenticateToken, requirePermission('DELETE_CATALOG'), ...);
```

```typescript
// backend/src/routes/stockMovementRoutes.ts
router.get('/', authenticateToken, requirePermission('VIEW_STOCK'), getStockMovements);
router.post('/', authenticateToken, requirePermission('CREATE_STOCK_MOVEMENT'), ...);
router.put('/:id', authenticateToken, requirePermission('EDIT_STOCK_MOVEMENT'), ...);
router.delete('/:id', authenticateToken, requirePermission('DELETE_STOCK_MOVEMENT'), ...);
```

#### **3. Bloquer Stock Négatif**
```typescript
// backend/src/controllers/stockMovementController.ts
export const createStockMovement = async (req, res) => {
  const { deviceId, type, quantity } = req.body;
  
  if (type === 'OUT' || type === 'REMOVAL') {
    // Vérifier stock disponible
    const stockCheck = await pool.query(`
      SELECT COUNT(*) as available
      FROM devices
      WHERE id = $1 AND tenant_id = $2 AND status = 'IN_STOCK'
    `, [deviceId, tenantId]);
    
    if (stockCheck.rows[0].available < quantity) {
      return res.status(400).json({ 
        error: 'Insufficient stock',
        available: stockCheck.rows[0].available,
        requested: quantity
      });
    }
  }
  
  // ... INSERT mouvement
}
```

---

### 🟡 IMPORTANT (72h)

#### **4. Vérification Unicité Catalogue**
```typescript
// backend/src/routes/catalogRoutes.ts - POST
router.post('/', validateRequest(CatalogSchema), async (req, res) => {
  const { sku } = req.body;
  const tenantId = req.user?.tenantId;
  
  // Vérifier unicité SKU
  if (sku) {
    const existing = await pool.query(
      'SELECT id FROM catalog WHERE sku = $1 AND tenant_id = $2',
      [sku, tenantId]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'SKU already exists' });
    }
  }
  
  // ... INSERT
});
```

#### **5. Transaction Atomique Mouvements**
```typescript
export const createStockMovement = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. INSERT mouvement
    await client.query('INSERT INTO stock_movements ...');
    
    // 2. UPDATE device status
    await client.query('UPDATE devices SET status = $1 WHERE id = $2', [newStatus, deviceId]);
    
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

#### **6. Soft Delete Catalogue**
```typescript
// Migration: backend/migrations/YYYYMMDD_add_deleted_at_catalog.sql
ALTER TABLE catalog ADD COLUMN deleted_at TIMESTAMPTZ;

-- Route DELETE devient :
router.delete('/:id', async (req, res) => {
  await pool.query(
    'UPDATE catalog SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );
});

-- Requêtes SELECT doivent filtrer :
SELECT * FROM catalog WHERE tenant_id = $1 AND deleted_at IS NULL
```

---

### 🟢 AMÉLIORATIONS (1 semaine)

#### **7. Améliorer Validation Zod**
```typescript
// backend/src/schemas/index.ts
export const StockMovementSchema = z.object({
  itemId: z.string().uuid('Invalid device ID'),
  type: z.enum(['IN', 'OUT', 'TRANSFER', 'ADJUSTMENT']),
  quantity: z.number().int().positive(),
  reason: z.string().min(1).optional(),
  reference: z.string().optional(),
  sourceLocation: z.string().optional(),
  destLocation: z.string().optional(),
}).refine((data) => {
  if (data.type === 'TRANSFER') {
    return !!data.sourceLocation && !!data.destLocation;
  }
  if (data.type === 'OUT') {
    return !!data.reason; // Raison obligatoire pour sorties
  }
  return true;
}, {
  message: "Invalid movement data"
});

export const CatalogSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['DEVICE', 'ACCESSORY', 'SERVICE', 'SIM', 'SUBSCRIPTION']),
  sku: z.string().min(1), // Obligatoire
  description: z.string().optional(),
  purchasePrice: z.number().min(0).optional().default(0),
  sellingPrice: z.number().min(0).max(1000000), // Limite max
  taxRate: z.number().min(0).max(100).optional().default(18),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE'),
}).refine((data) => data.sellingPrice >= (data.purchasePrice || 0), {
  message: "Selling price must be >= purchase price"
});
```

#### **8. Audit Log Complet**
```typescript
// backend/src/controllers/catalogController.ts
import { AuditService } from '../services/AuditService';

router.post('/', async (req, res) => {
  // ... création article
  
  AuditService.log({
    userId: req.user.id,
    action: 'CREATE',
    entityType: 'catalog',
    entityId: newItem.id,
    tenantId,
    details: { sku: newItem.sku, name: newItem.name }
  });
});

router.delete('/:id', async (req, res) => {
  // ... suppression
  
  AuditService.log({
    userId: req.user.id,
    action: 'DELETE',
    entityType: 'catalog',
    entityId: id,
    tenantId,
    details: { reason: req.body.reason }
  });
});
```

---

## 📊 CHECKLIST FINALE

### Sécurité
- [ ] ❌ Isolation tenant_id sur TOUTES routes
- [ ] ❌ Permissions RBAC appliquées
- [ ] ❌ Faille injection tenant_id corrigée
- [ ] ❌ Accès global 'trackyu' tenant sécurisé

### Logique Métier
- [ ] ❌ Stock négatif bloqué
- [ ] ❌ Transactions atomiques mouvements
- [ ] ❌ Vérification unicité SKU catalogue
- [ ] ❌ Validation prix (vente >= achat)

### Traçabilité
- [ ] ✅ Mouvements tracent `user_id` (partial)
- [ ] ❌ Catalogue trace créateur
- [ ] ❌ AuditLog sur actions critiques
- [ ] ❌ Soft delete partout

### Validation
- [ ] ✅ Schemas Zod présents (partial)
- [ ] ❌ Validation conditionnelle (TRANSFER)
- [ ] ❌ Validation cohérence métier

---

## 🎯 RÉSUMÉ EXÉCUTIF

Le module **Stock/Inventaire** présente des **vulnérabilités critiques** mettant en danger l'isolation multi-tenant :

### 🔴 Top 3 Risques
1. **Injection tenant_id** permettant la création de mouvements cross-tenant
2. **Absence totale de RBAC** - tout utilisateur peut manipuler le stock
3. **Stock négatif autorisé** - divergence inventaire physique/DB

### 📈 Effort de Correction
- **Urgent (24h)** : 8 heures dev + 2 heures tests
- **Important (72h)** : 12 heures dev + 4 heures tests
- **Améliorations** : 16 heures dev + 6 heures tests

### 💡 Recommandation
**BLOQUER EN PRODUCTION** les routes suivantes jusqu'à correction :
- `POST /api/stock-movements` (injection tenant_id)
- `POST /api/catalog` (pas de RBAC)
- `DELETE /api/catalog/:id` (hard delete)

---

**Auditeur** : GitHub Copilot  
**Date** : 3 février 2026  
**Prochaine revue** : Après corrections urgentes (dans 48h)
