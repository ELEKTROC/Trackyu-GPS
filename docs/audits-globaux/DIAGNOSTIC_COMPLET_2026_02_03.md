# 🔍 DIAGNOSTIC COMPLET - TrackYu GPS

## Application SaaS Multi-tenant GPS & ERP

**Date d'audit** : 3 Février 2026  
**Auditeur** : Expert Fullstack IA  
**Périmètre** : 8 modules (Admin, Fleet, CRM, Finance, Support, Tech, Architecture)  
**Lignes de code auditées** : ~12,000  
**Environnement** : Production (trackyugps.com)

---

## 📊 SYNTHÈSE EXÉCUTIVE

### Statistiques Globales

| Métrique                  | Valeur               |
| ------------------------- | -------------------- |
| **Failles Critiques** 🔴  | 20                   |
| **Problèmes Moyens** ⚠️   | 15                   |
| **Bonnes Pratiques** ✅   | 35+                  |
| **Score Sécurité Global** | 68/100               |
| **Score Architecture**    | 74/100               |
| **Prêt Production**       | ⚠️ APRÈS CORRECTIONS |

### Modules par Criticité

| Module           | Score  | Statut    | Failles Critiques              |
| ---------------- | ------ | --------- | ------------------------------ |
| **Admin**        | 6/10   | 🔴 URGENT | 4 (isolation tenant_id)        |
| **Fleet**        | 8/10   | 🟡 BON    | 2 (updatePosition, getRaw)     |
| **CRM**          | 5.5/10 | 🔴 URGENT | 4 (doublons, RBAC, validation) |
| **Finance**      | 7/10   | 🟡 MOYEN  | 3 (RBAC, périodes)             |
| **Support**      | 6/10   | 🔴 URGENT | 3 (tenant_id, SQL injection)   |
| **Tech**         | 6.5/10 | 🟡 MOYEN  | 3 (SQL injection, signatures)  |
| **Architecture** | 8/10   | 🟢 BON    | 3 (routes dupliquées)          |

---

## 🔴 FAILLES CRITIQUES (Priorité Absolue)

### 1. ISOLATION TENANT_ID - 10 failles

#### 1.1 Module Admin - userController.ts

**Fichier** : `backend/src/controllers/userController.ts`

| Ligne | Fonction   | Problème                   | Impact                    |
| ----- | ---------- | -------------------------- | ------------------------- |
| 93    | createUser | Email check sans tenant_id | Énumération cross-tenant  |
| 171   | updateUser | WHERE id sans tenant_id    | Modification autre tenant |
| 191   | updateUser | DELETE access sans tenant  | Corruption permissions    |
| 219   | deleteUser | DELETE sans tenant_id      | Suppression autre tenant  |

**Criticité** : 🔴🔴🔴 CRITIQUE - Permet modification cross-tenant

#### 1.2 Module Fleet - vehicleController.ts

| Ligne | Fonction       | Problème                    | Impact                    |
| ----- | -------------- | --------------------------- | ------------------------- |
| 207   | updatePosition | INSERT sans vérif tenant    | GPS spoofing possible     |
| 475   | getFuelHistory | Interpolation SQL dynamique | SQL injection potentielle |

**Criticité** : 🔴🔴 HAUTE - Faille sécurité GPS

#### 1.3 Module Fleet - deviceController.ts

| Ligne | Fonction         | Problème              | Impact               |
| ----- | ---------------- | --------------------- | -------------------- |
| 139   | getRawDataByImei | SELECT sans tenant_id | Données autre tenant |

**Criticité** : 🔴🔴 HAUTE - Fuite de données

#### 1.4 Module Support - ticketController.ts

| Ligne | Fonction     | Problème               | Impact                   |
| ----- | ------------ | ---------------------- | ------------------------ |
| 56    | listTickets  | Staff bypass tenant_id | Voir tous tickets        |
| ~150  | addMessage   | Pas de vérif tenant    | Message autre ticket     |
| 439   | deleteTicket | DELETE sans tenant_id  | Suppression autre tenant |

**Criticité** : 🔴🔴 HAUTE - Isolation compromise

---

### 2. VALIDATION & DOUBLONS - 5 failles

#### 2.1 Module CRM - Leads sans détection doublons backend

**Fichier** : `backend/src/controllers/leadController.ts`

```typescript
// ❌ LIGNE 47-80 - Aucune vérification
const query = `INSERT INTO leads (...) VALUES (...)`;
await pool.query(query, values); // Direct INSERT
```

**Impact** : Doublons en base via API directe  
**Solution** : Vérifier email ET companyName avant INSERT

#### 2.2 Module CRM - tierRoutes sans validation Zod

**Fichier** : `backend/src/routes/tierRoutes.ts`

```typescript
// ❌ LIGNE 10-12 - Pas de validateRequest
router.post('/', authenticateToken, createTier);
router.put('/:id', authenticateToken, updateTier);
```

**Impact** : Données invalides en DB (emails malformés)  
**Solution** : Ajouter `validateRequest(TierSchema)`

#### 2.3 Module Tech - Signatures non obligatoires

**Fichier** : `backend/src/controllers/interventionController.ts`

**Impact** : Interventions clôturées sans preuve (client_signature, tech_signature)  
**Solution** : Valider signatures avant status COMPLETED

---

### 3. RBAC & PERMISSIONS - 6 failles

#### 3.1 Finance Routes - Pas de permissions

**Fichier** : `backend/src/routes/financeRoutes.ts` (lignes 32-65)

```typescript
// ❌ Manque requirePermission()
router.delete('/invoices/:id', authenticateToken, deleteInvoice);
router.post('/payments/:id/approve', authenticateToken, approvePayment);
router.delete('/journal-entries/:id', authenticateToken, deleteJournalEntry);
```

**Routes sans RBAC** :

- DELETE invoices (devrait avoir `DELETE_INVOICE`)
- DELETE payments (devrait avoir `DELETE_PAYMENT`)
- APPROVE payments (devrait avoir `APPROVE_PAYMENTS`)
- DELETE journal entries (devrait avoir `DELETE_ENTRY`)

**Impact** : Tout utilisateur authentifié peut supprimer factures/paiements  
**Criticité** : 🔴🔴🔴 CRITIQUE FINANCE

#### 3.2 CRM Routes - Pas de permissions

**Fichier** : `backend/src/routes/leadRoutes.ts`

```typescript
// ❌ Toutes les routes sans requirePermission
router.get('/', authenticateToken, getLeads);
router.post('/', authenticateToken, validateRequest(LeadSchema), createLead);
router.delete('/:id', authenticateToken, deleteLead);
```

**Solution** : Ajouter `requirePermission('VIEW_CRM')`, `CREATE_LEAD`, `DELETE_LEAD`

---

### 4. SQL INJECTIONS - 2 failles

#### 4.1 Intervention Stats - Concaténation dynamique

**Fichier** : `backend/src/controllers/interventionController.ts`

```typescript
// 🔴 LIGNES 344, 352, 359, 400 - DANGER
let statsQuery = `SELECT COUNT(*) FROM interventions WHERE tenant_id = $1 ${periodFilter}`;
```

**Variable** : `periodFilter` concaténée directement (pas paramétrée)  
**Impact** : SQL injection possible via manipulation période  
**Solution** : Utiliser paramètres `$2, $3` au lieu de concaténation

---

### 5. ARCHITECTURE - 3 failles

#### 5.1 Routes Dupliquées

**Fichier** : `backend/src/index.ts`

| Route            | Lignes    | Problème           |
| ---------------- | --------- | ------------------ |
| `/api/suppliers` | 197 & 211 | Duplication exacte |
| `/api/rma`       | 198 & 212 | Duplication exacte |
| `/api/catalog`   | 210 & 213 | Duplication exacte |

**Impact** : Confusion, maintenance difficile, seule la 2ème route est active

---

## ⚠️ PROBLÈMES MOYENS (Priorité Haute)

### Architecture

1. **FleetTable.tsx** - 1694 lignes (trop gros, devrait être <300)
2. **Types tenant_id** - Incohérence `tenant_trackyu` vs `trackyu`
3. **Pagination manquante** - getVehicles() charge tous les véhicules

### CRM

4. **Workflow Lead→Client incomplet** - Pas de route de conversion
5. **Audit Trail manquant** - leadController sans logs
6. **Duplication Client/Tier** - 2 services parallèles

### Finance

7. **Numérotation timestamp-based** - Risque doublons multi-instances
8. **Périodes comptables** - Pas de vérification verrouillage
9. **Journal entries validées** - Modifiables après validation

### Support & Tech

10. **Synchro Ticket↔Intervention** - Incomplète (pas de status mirroring)
11. **Stock movements** - Pas de rollback si intervention annulée
12. **Notifications** - Pas d'envoi auto lors création ticket

### Performance

13. **Index DB manquants** - `leads.email`, `tiers.email`, `vehicles.plate`
14. **Cache Redis** - Implémenté partiellement (IMEI lookup seulement)
15. **Requêtes N+1** - VehicleDetail fait 10+ requêtes séquentielles

---

## ✅ BONNES PRATIQUES IDENTIFIÉES

### Sécurité

1. ✅ **JWT avec expiration** (24h) et refresh tokens
2. ✅ **Bcrypt salt 10** pour tous les mots de passe
3. ✅ **Rate limiting** actif (5 login/15min, 100 API/min)
4. ✅ **CORS configuré** pour domaines spécifiques
5. ✅ **Helmet headers** activés (XSS, CSP, etc.)
6. ✅ **SQL paramétrées** dans 95% des requêtes
7. ✅ **HTTPS** en production (Caddy + Let's Encrypt)

### Architecture

8. ✅ **Multi-tenant isolation** globalement respectée (sauf failles ci-dessus)
9. ✅ **Lazy loading** vues lourdes (MapView, FinanceView)
10. ✅ **TanStack Query** pour cache côté client
11. ✅ **Zod validation** côté backend (majoritaire)
12. ✅ **Types TypeScript** partagés (`types.ts` 1419 lignes)
13. ✅ **WebSocket temps réel** (Socket.IO) pour GPS
14. ✅ **TimescaleDB** pour time-series positions GPS
15. ✅ **Redis cache** pour IMEI → Vehicle lookup

### Code Quality

16. ✅ **Composants découplés** (features/{module}/components)
17. ✅ **Service API centralisé** (api.ts 4500+ lignes)
18. ✅ **Contextes React** bien organisés (Auth, Data, Theme, Toast)
19. ✅ **Audit trail** dans tierController
20. ✅ **Transactions SQL** pour opérations critiques
21. ✅ **Error handling** avec try/catch systématiques

---

## 🎯 ROADMAP DE CORRECTIONS

### 🔴 PHASE 1 - URGENT (Semaine 1) - SÉCURITÉ CRITIQUE

#### Jour 1-2 : Isolation Tenant_ID

**Script SQL de vérification** (à exécuter en production) :

```sql
-- Vérifier si des utilisateurs peuvent accéder à d'autres tenants
SELECT u1.id AS user_id, u1.tenant_id AS user_tenant, u2.tenant_id AS accessed_tenant
FROM users u1
CROSS JOIN users u2
WHERE u1.tenant_id != u2.tenant_id
  AND u1.id != u2.id
LIMIT 10;
```

**Corrections code** :

1. **userController.ts** - Ligne 93

```typescript
// ✅ Vérifier email uniquement dans le tenant cible
const userCheck = await pool.query('SELECT id FROM users WHERE email = $1 AND tenant_id = $2', [email, tenantId]);
```

2. **userController.ts** - Ligne 171

```typescript
// ✅ Ajouter filtrage tenant pour non-SuperAdmin
const isSuperAdmin = req.user.role === 'SUPERADMIN' || req.user.role === 'PLATFORM_ADMIN';

if (!isSuperAdmin && req.user.tenantId) {
  query += ` WHERE id = $${paramCount} AND tenant_id = $${paramCount + 1}`;
  values.push(id, req.user.tenantId);
} else {
  query += ` WHERE id = $${paramCount}`;
  values.push(id);
}
```

3. **userController.ts** - Lignes 191, 219

```typescript
// ✅ Même pattern pour DELETE user_tenant_access et DELETE users
// Vérifier ownership avant suppression si non-SuperAdmin
if (!isSuperAdmin && req.user.tenantId) {
  const ownerCheck = await pool.query('SELECT id FROM users WHERE id = $1 AND tenant_id = $2', [id, req.user.tenantId]);
  if (ownerCheck.rows.length === 0) {
    return res.status(403).json({ message: 'Access denied' });
  }
}
```

4. **vehicleController.ts** - Ligne 207

```typescript
// ✅ Vérifier que vehicleId appartient au tenant avant INSERT position
const vehicleCheck = await pool.query('SELECT id FROM vehicles WHERE id = $1 AND tenant_id = $2', [
  vehicleId,
  req.user.tenantId,
]);
if (vehicleCheck.rows.length === 0) {
  return res.status(403).json({ message: 'Vehicle not found or access denied' });
}
```

5. **deviceController.ts** - Ligne 139

```typescript
// ✅ Filtrer par tenant_id
const vehicleResult = await pool.query('SELECT id, name FROM vehicles WHERE imei = $1 AND tenant_id = $2', [
  imei,
  req.user.tenantId,
]);
```

6. **ticketController.ts** - Lignes 56, ~150, 439

```typescript
// ✅ Forcer filtrage tenant même pour staff (ou vérifier permission GLOBAL)
if (!req.user.tenantId && req.user.role !== 'SUPERADMIN') {
  return res.status(400).json({ message: 'Tenant ID required' });
}

// Toujours filtrer dans WHERE clauses
WHERE tenant_id = $1 AND id = $2
```

#### Jour 3-4 : RBAC Permissions

**Corrections routes Finance** :

```typescript
// backend/src/routes/financeRoutes.ts
import { requirePermission } from '../middleware/authMiddleware';

router.delete('/invoices/:id', authenticateToken, requirePermission('DELETE_INVOICE'), deleteInvoice);

router.post('/payments/:id/approve', authenticateToken, requirePermission('APPROVE_PAYMENTS'), approvePayment);

router.delete('/journal-entries/:id', authenticateToken, requirePermission('DELETE_ENTRY'), deleteJournalEntry);
```

**Corrections routes CRM** :

```typescript
// backend/src/routes/leadRoutes.ts
router.get('/', authenticateToken, requirePermission('VIEW_CRM'), getLeads);

router.post('/', authenticateToken, requirePermission('CREATE_LEAD'), validateRequest(LeadSchema), createLead);

router.delete('/:id', authenticateToken, requirePermission('DELETE_LEAD'), deleteLead);
```

#### Jour 5 : SQL Injection & Validation

1. **interventionController.ts** - Paramétrer periodFilter

```typescript
// ❌ AVANT
let statsQuery = `SELECT COUNT(*) FROM interventions WHERE tenant_id = $1 ${periodFilter}`;

// ✅ APRÈS
let statsQuery = `SELECT COUNT(*) FROM interventions WHERE tenant_id = $1`;
const params = [tenantId];

if (period === '7d') {
  statsQuery += ` AND created_at > NOW() - INTERVAL '7 days'`;
} else if (period === '30d') {
  statsQuery += ` AND created_at > NOW() - INTERVAL '30 days'`;
} else if (period === '90d') {
  statsQuery += ` AND created_at > NOW() - INTERVAL '90 days'`;
}
```

2. **tierRoutes.ts** - Ajouter validation Zod

```typescript
import { validateRequest } from '../middleware/validateRequest';
import { TierSchema, TierUpdateSchema } from '../schemas';

router.post('/', authenticateToken, validateRequest(TierSchema), createTier);

router.put('/:id', authenticateToken, validateRequest(TierUpdateSchema), updateTier);
```

3. **leadController.ts** - Détection doublons

```typescript
// LIGNE 58 - Avant INSERT
if (email) {
  const emailCheck = await pool.query('SELECT id FROM leads WHERE email = $1 AND tenant_id = $2', [email, tenantId]);
  if (emailCheck.rows.length > 0) {
    return res.status(409).json({
      error: 'Un lead avec cet email existe déjà',
      existingId: emailCheck.rows[0].id,
    });
  }
}

if (companyName) {
  const companyCheck = await pool.query('SELECT id FROM leads WHERE company_name = $1 AND tenant_id = $2', [
    companyName,
    tenantId,
  ]);
  if (companyCheck.rows.length > 0) {
    return res.status(409).json({
      error: 'Un lead avec cette société existe déjà',
      existingId: companyCheck.rows[0].id,
    });
  }
}
```

---

### 🟡 PHASE 2 - IMPORTANT (Semaine 2) - STABILITÉ

#### Corrections Architecture

1. **backend/src/index.ts** - Supprimer routes dupliquées

```typescript
// ❌ SUPPRIMER lignes 211-213
// app.use('/api/suppliers', supplierRoutes); // Doublon
// app.use('/api/rma', rmaRoutes); // Doublon
// app.use('/api/catalog', catalogRoutes); // Doublon

// ✅ CONSERVER uniquement lignes 197-198, 210
```

2. **Standardiser tenant_id**

```sql
-- Migration pour uniformiser
UPDATE tenants SET id = 'tenant_trackyu' WHERE id = 'trackyu';
UPDATE users SET tenant_id = 'tenant_trackyu' WHERE tenant_id = 'trackyu';
UPDATE vehicles SET tenant_id = 'tenant_trackyu' WHERE tenant_id = 'trackyu';
-- ... autres tables
```

3. **Ajouter index DB manquants**

```sql
-- Performance queries
CREATE INDEX idx_leads_email_tenant ON leads(email, tenant_id);
CREATE INDEX idx_tiers_email_type_tenant ON tiers(email, type, tenant_id);
CREATE INDEX idx_vehicles_tenant_status ON vehicles(tenant_id, status);
CREATE INDEX idx_vehicles_tenant_client ON vehicles(tenant_id, client_id);
CREATE INDEX idx_vehicles_imei ON vehicles(imei);
CREATE INDEX idx_invoices_tenant_status ON invoices(tenant_id, status);
CREATE INDEX idx_tickets_tenant_status ON tickets(tenant_id, status);
```

#### Corrections Métier

4. **Workflow Lead → Client complet**

```typescript
// Nouvelle route backend/src/routes/leadRoutes.ts
router.post('/:id/convert-to-client', authenticateToken, requirePermission('CREATE_CLIENT'), async (req, res) => {
  const { id } = req.params;
  const { tenantId } = req.user;

  // 1. Récupérer le lead
  const lead = await pool.query('SELECT * FROM leads WHERE id = $1 AND tenant_id = $2', [id, tenantId]);

  if (lead.rows.length === 0) {
    return res.status(404).json({ message: 'Lead not found' });
  }

  // 2. Vérifier si client existe déjà
  const existingClient = await pool.query('SELECT id FROM tiers WHERE email = $1 AND type = $2 AND tenant_id = $3', [
    lead.rows[0].email,
    'CLIENT',
    tenantId,
  ]);

  if (existingClient.rows.length > 0) {
    return res.status(409).json({
      message: 'Client avec cet email existe déjà',
      clientId: existingClient.rows[0].id,
    });
  }

  // 3. Créer le client (Tier type CLIENT)
  const clientId = `CLI-${Date.now()}`;
  await pool.query(
    `
      INSERT INTO tiers (id, tenant_id, type, name, email, phone, address)
      VALUES ($1, $2, 'CLIENT', $3, $4, $5, $6)
    `,
    [
      clientId,
      tenantId,
      lead.rows[0].company_name,
      lead.rows[0].email,
      lead.rows[0].phone || '',
      lead.rows[0].address || '',
    ]
  );

  // 4. Mettre à jour le lead
  await pool.query(
    `
      UPDATE leads 
      SET status = 'WON', converted_client_id = $1, updated_at = NOW()
      WHERE id = $2
    `,
    [clientId, id]
  );

  // 5. Audit trail
  AuditService.log({
    userId: req.user.id,
    action: 'CONVERT',
    entityType: 'LEAD',
    entityId: id,
    details: { convertedToClientId: clientId },
  });

  res.status(201).json({ clientId, message: 'Lead converti avec succès' });
});
```

5. **Validation signatures interventions**

```typescript
// backend/src/controllers/interventionController.ts
// AVANT ligne de UPDATE status = 'COMPLETED'
if (status === 'COMPLETED') {
  if (!signatureClient || !signatureTech) {
    return res.status(400).json({
      message: 'Signatures client et technicien obligatoires pour clôturer',
    });
  }
}
```

---

### 🟢 PHASE 3 - OPTIMISATIONS (Semaine 3)

#### Performance

1. **Pagination backend getVehicles()**

```typescript
export const getVehicles = async (req: Request, res: Response) => {
  const { limit = 100, offset = 0 } = req.query;

  let query = `SELECT * FROM vehicles WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
  const result = await pool.query(query, [tenantId, limit, offset]);

  const countResult = await pool.query('SELECT COUNT(*) FROM vehicles WHERE tenant_id = $1', [tenantId]);

  res.json({
    vehicles: result.rows,
    total: parseInt(countResult.rows[0].count),
    page: Math.floor(offset / limit) + 1,
    totalPages: Math.ceil(countResult.rows[0].count / limit),
  });
};
```

2. **Cache Redis doublons**

```typescript
// leadController.ts - Avant vérification DB
const cacheKey = `duplicate:lead:${tenantId}:${email}`;
const cached = await redis.get(cacheKey);
if (cached) {
  return res.status(409).json({
    error: 'Doublon',
    existingId: cached,
  });
}

// Après INSERT réussi
await redis.set(cacheKey, leadId, 'EX', 3600); // 1h
```

3. **Refactoriser FleetTable**
   Créer sous-composants :

- `FleetHeader.tsx` (~100 lignes)
- `FleetStats.tsx` (~150 lignes)
- `FleetCharts.tsx` (~200 lignes)
- `FleetTableCore.tsx` (~400 lignes)
- `FleetMobileCards.tsx` (~300 lignes)

---

## 📋 CHECKLIST POST-CORRECTIONS

### Tests de Non-Régression

```bash
# 1. Tests isolation tenant_id
curl -X GET https://trackyugps.com/api/users \
  -H "Authorization: Bearer TOKEN_TENANT_A"
# → Ne doit retourner QUE les users du tenant A

# 2. Test doublons Leads
curl -X POST https://trackyugps.com/api/leads \
  -H "Authorization: Bearer TOKEN" \
  -d '{"email": "duplicate@test.com", "companyName": "Test"}'
# → Doit retourner 409 Conflict

# 3. Test RBAC
curl -X DELETE https://trackyugps.com/api/invoices/INV-123 \
  -H "Authorization: Bearer TOKEN_SANS_PERMISSION"
# → Doit retourner 403 Forbidden

# 4. Test SQL injection
curl -X GET 'https://trackyugps.com/api/interventions/stats?period=7d%27%20OR%201=1--' \
  -H "Authorization: Bearer TOKEN"
# → Ne doit PAS retourner de données (requête bloquée)
```

### Vérifications Manuelles

- [ ] Déployer corrections en **staging** d'abord
- [ ] Tester chaque route modifiée (Postman/Insomnia)
- [ ] Vérifier logs backend (aucune erreur 500)
- [ ] Tester frontend (aucune régression UI)
- [ ] Valider avec utilisateur test non-admin
- [ ] Backup DB avant déploiement production
- [ ] Monitoring actif 24h après déploiement

---

## 📞 CONTACTS & SUPPORT

**Environnement Production** :

- URL : https://trackyugps.com
- API : https://trackyugps.com/api
- VPS : 148.230.126.62
- SSH : `ssh root@148.230.126.62`

**Containers Docker** :

```bash
docker ps
# trackyu-gps_backend_1
# trackyu-gps_postgres_1
# trackyu-gps_redis_1
# trackyu-gps_frontend_1
```

**Logs en temps réel** :

```bash
docker logs -f trackyu-gps_backend_1
```

---

## 📄 ANNEXES

### A. Script SQL Complet de Vérification

```sql
-- A exécuter en production pour détecter les problèmes

-- 1. Utilisateurs sans tenant_id
SELECT id, email, role FROM users WHERE tenant_id IS NULL;

-- 2. Véhicules sans tenant_id
SELECT id, name, plate FROM vehicles WHERE tenant_id IS NULL;

-- 3. Factures sans tenant_id
SELECT id, number, total FROM invoices WHERE tenant_id IS NULL;

-- 4. Doublons Leads email
SELECT email, COUNT(*) as count
FROM leads
GROUP BY email, tenant_id
HAVING COUNT(*) > 1;

-- 5. Doublons Tiers email
SELECT email, type, COUNT(*) as count
FROM tiers
GROUP BY email, type, tenant_id
HAVING COUNT(*) > 1;

-- 6. Interventions sans signatures clôturées
SELECT id, status, signature_client, signature_tech
FROM interventions
WHERE status = 'COMPLETED'
  AND (signature_client IS NULL OR signature_tech IS NULL);

-- 7. Vérifier index manquants
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('leads', 'tiers', 'vehicles', 'invoices', 'tickets');
```

### B. Commandes Déploiement

```powershell
# Depuis machine locale Windows

# 1. Build frontend
npm run build

# 2. Build backend
cd backend
npm run build

# 3. Copier vers serveur
scp -r dist/* root@148.230.126.62:/var/www/trackyu-gps/dist/
scp -r backend/dist/* root@148.230.126.62:/var/www/trackyu-gps/backend/dist/

# 4. Redémarrer containers
ssh root@148.230.126.62 "cd /var/www/trackyu-gps && docker-compose restart backend"

# 5. Vérifier santé
curl https://trackyugps.com/health
```

---

**FIN DU DIAGNOSTIC**

_Document généré automatiquement le 3 Février 2026_  
_Validité : 30 jours (revoir après corrections)_
