# AUDIT COMPLET — Module Catalogue (Catalog)

**Date** : 27 février 2026  
**Module** : Catalogue Produits & Services  
**Périmètre** : Frontend + Backend + Base de données + Intégrations

---

## 1. Fichiers Découverts

### Backend

| Fichier                                                        | Rôle                                         |
| -------------------------------------------------------------- | -------------------------------------------- |
| `backend/src/routes/catalogRoutes.ts`                          | Routes CRUD (5 endpoints)                    |
| `backend/src/schemas/index.ts` (L548-559)                      | Schéma Zod backend                           |
| `backend/src/controllers/interventionController.ts` (L655-668) | Lookup catalogue pour prix mutation          |
| `backend/src/controllers/supplierController.ts` (L333)         | JOIN catalog pour stats fournisseur          |
| `backend/src/controllers/contractController.ts` (L31)          | Référence `catalogItemId` dans items contrat |
| `backend/create_catalog_table.ts`                              | Script de création table + seed              |

### Frontend

| Fichier                                                        | Rôle                                               |
| -------------------------------------------------------------- | -------------------------------------------------- |
| `features/crm/components/CatalogForm.tsx`                      | Formulaire création/édition                        |
| `features/crm/components/CatalogList.tsx`                      | Liste paginée, tri, sélection                      |
| `features/crm/components/CatalogDetail.tsx`                    | Vue détail avec onglets (Transactions, Historique) |
| `features/crm/components/CRMView.tsx`                          | Conteneur parent (mode CATALOG)                    |
| `features/crm/components/PresalesView.tsx`                     | Onglet Catalogue avec KPIs                         |
| `features/finance/components/InvoiceForm.tsx`                  | Autocomplete catalogue dans factures               |
| `features/finance/components/FinanceView.tsx`                  | Passe `catalogItems` aux formulaires               |
| `features/crm/components/ContractForm.tsx`                     | Sélection catalogue dans items contrat             |
| `features/crm/components/LeadFormModal.tsx`                    | Sélection produits intéressés                      |
| `features/tech/components/InterventionForm.tsx`                | Référence catalogItems pour matériel               |
| `features/tech/components/InterventionRequestTab.tsx`          | Filtre catalogItems par catégorie                  |
| `features/tech/components/partials/InterventionRequestTab.tsx` | Idem (partials)                                    |
| `features/tech/components/partials/InterventionVehicleTab.tsx` | Filtre catalogItems par catégorie                  |
| `features/tech/hooks/useInterventionForm.ts`                   | Fournit catalogItems au form                       |
| `features/stock/components/StockView.tsx`                      | Utilise catalogItems + générateur mock             |

### Données partagées

| Fichier                         | Rôle                                            |
| ------------------------------- | ----------------------------------------------- |
| `types.ts` (L772-800)           | Interface `CatalogItem`                         |
| `schemas/catalogSchema.ts`      | Schéma Zod frontend                             |
| `services/api.ts` (L2845-2920)  | Méthodes API (list, create, update, delete)     |
| `contexts/DataContext.tsx`      | Query + Mutations TanStack (add/update/delete)  |
| `constants.ts` (L168-180)       | `PRODUCT_CATALOG` — données hardcodées fallback |
| `services/mockDataGenerator.ts` | Générateur mock catalog items                   |

### Tests

| Fichier                             | Rôle                                   |
| ----------------------------------- | -------------------------------------- |
| `tests/CRMValidation.test.tsx`      | Tests validation CRM avec mock catalog |
| `tests/CRMIntegration.test.tsx`     | Test intégration mode CATALOG          |
| `tests/StockIntegration.test.tsx`   | Mock catalogItems dans stock           |
| `tests/FinanceIntegration.test.tsx` | Mock catalogItems dans finance         |

### Base de données (Production)

| Table           | Lignes | Statut                         |
| --------------- | ------ | ------------------------------ |
| `catalog`       | 104    | **Active, utilisée**           |
| `catalog_items` | 0      | **Orpheline, jamais utilisée** |

---

## 2. Findings

---

### 🔴 CRITICAL-01 : Backend INSERT/UPDATE référencent des colonnes inexistantes

**Fichier** : `backend/src/routes/catalogRoutes.ts` L79, L95  
**Sévérité** : **CRITICAL**

Les requêtes SQL du POST et PUT font référence aux colonnes `purchase_price` et `selling_price` qui **n'existent pas** dans la table `catalog` en production. La table utilise `unit_price`.

```sql
-- ROUTE POST (L79) - CRASH GARANTI
INSERT INTO catalog (id, name, type, sku, description, purchase_price, selling_price, ...)
-- ❌ purchase_price et selling_price n'existent pas en DB !
-- DB réelle a: unit_price (numeric 12,2)
```

**Impact** : Toute tentative de création ou modification d'un article catalogue via l'API **échoue silencieusement** (le catch renvoie 500). Les 104 articles en production ont très probablement été importés par script Zoho, pas via l'API.

**Fix** :

```typescript
// POST route - remplacer purchase_price/selling_price par unit_price
'INSERT INTO catalog (id, name, type, sku, description, unit_price, category, unit, tax_rate, status, tenant_id, is_sellable, is_purchasable, track_stock, accounting_account_sale, accounting_account_purchase, image_url) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *';

// PUT route - idem
'UPDATE catalog SET name=COALESCE($2,name), type=COALESCE($3,type), sku=COALESCE($4,sku), description=COALESCE($5,description), unit_price=COALESCE($6,unit_price), category=COALESCE($7,category), unit=COALESCE($8,unit), tax_rate=COALESCE($9,tax_rate), status=COALESCE($10,status), ...';
```

---

### 🔴 CRITICAL-02 : Schéma Zod backend incompatible avec le frontend et la DB

**Fichier** : `backend/src/schemas/index.ts` L548-559  
**Sévérité** : **CRITICAL**

Le schéma backend accepte `type: ['DEVICE', 'ACCESSORY', 'SERVICE', 'SIM', 'SUBSCRIPTION']` alors que :

- La DB stocke `type: 'Produit' | 'Service'` (CHECK constraint sur `catalog_items`, et valeurs réelles dans `catalog`)
- Le frontend envoie `type: 'Produit' | 'Service'`
- Le schéma frontend (`schemas/catalogSchema.ts`) utilise `type: ['Produit', 'Service']`

**Impact** : La validation Zod backend **rejette systématiquement** les données envoyées par le frontend avec `type: 'Produit'` ou `'Service'`, car elle attend `'DEVICE'`, `'ACCESSORY'`, etc.

De plus, le schéma backend utilise `sellingPrice` / `purchasePrice` tandis que le frontend envoie `price`.

**Fix** : Aligner le schéma backend sur le frontend :

```typescript
export const CatalogSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  type: z.enum(['Produit', 'Service']),
  category: z.enum(['Matériel', 'Abonnement', 'Prestation', 'Package']).optional(),
  sku: z.string().optional(),
  description: z.string().optional(),
  price: z.number().min(0, 'Le prix doit être positif'),
  unit: z.string().optional(),
  taxRate: z.number().min(0).max(100).optional().default(18),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE'),
  isSellable: z.boolean().optional().default(true),
  isPurchasable: z.boolean().optional().default(false),
  trackStock: z.boolean().optional().default(false),
  accountingAccountSale: z.string().optional(),
  accountingAccountPurchase: z.string().optional(),
  imageUrl: z.string().optional(),
  resellerId: z.string().optional(),
});
```

---

### 🔴 CRITICAL-03 : GET /:id ne gère pas les staff users

**Fichier** : `backend/src/routes/catalogRoutes.ts` L56-67  
**Sévérité** : **CRITICAL**

La route `GET /:id` filtre **toujours** par `tenant_id`, même pour les staff/superadmin. Cela signifie qu'un superadmin ne peut pas voir les articles des autres tenants, contrairement au `GET /` qui utilise `isStaffUser()`.

```typescript
// GET /:id — force tenant_id même pour staff
const result = await pool.query(
  'SELECT * FROM catalog WHERE id = $1 AND tenant_id = $2', // ❌ Staff bloqué
  [id, tenantId]
);
```

**Fix** :

```typescript
let query = 'SELECT * FROM catalog WHERE id = $1';
let params: QueryParam[] = [id];
if (!isStaffUser(tenantId)) {
  query += ' AND tenant_id = $2';
  params.push(tenantId);
}
```

---

### 🔴 CRITICAL-04 : Le DELETE est un hard delete sans vérification de références

**Fichier** : `backend/src/routes/catalogRoutes.ts` L108-120  
**Sévérité** : **CRITICAL**

Le DELETE supprime définitivement l'enregistrement sans :

1. Vérifier si l'article est référencé dans des devis, factures ou contrats
2. Utiliser un soft-delete (`deleted_at`) pour préserver l'intégrité des documents
3. Logger l'action dans l'audit trail

**Impact** : Suppression d'un article → les factures/devis/contrats qui le référencent par `catalogItemId` deviennent orphelins avec des données incohérentes.

**Fix** :

```typescript
// 1. Vérifier les références avant suppression
const refs = await pool.query(
  `SELECT COUNT(*) as cnt FROM invoice_items WHERE catalog_item_id = $1
   UNION ALL SELECT COUNT(*) FROM quote_items WHERE catalog_item_id = $1`,
  [id]
);
if (refs.rows.some((r) => parseInt(r.cnt) > 0)) {
  return res.status(409).json({ message: 'Article référencé dans des documents, impossible de supprimer' });
}

// 2. Idéalement : soft-delete
("UPDATE catalog SET status = 'DELETED', updated_at = NOW() WHERE id = $1 AND tenant_id = $2");

// 3. Logger via AuditService
AuditService.log({ userId: req.user.id, action: 'DELETE', entityType: 'catalog', entityId: id });
```

---

### 🟡 MEDIUM-01 : Réponse du GET / masque l'erreur (res.json([]))

**Fichier** : `backend/src/routes/catalogRoutes.ts` L48-49  
**Sévérité** : **MEDIUM**

En cas d'erreur SQL, le handler catch retourne `res.json([])` au lieu d'un code 500. Le frontend ne sait jamais qu'il y a eu une erreur et affiche simplement une liste vide.

```typescript
catch (error: unknown) {
    logger.error('Error in GET /catalog:', error);
    res.json([]); // ❌ Masque l'erreur
}
```

**Fix** :

```typescript
res.status(500).json({ message: 'Erreur lors du chargement du catalogue', error: getErrorMessage(error) });
```

---

### 🟡 MEDIUM-02 : Mapping camelCase incohérent dans GET /

**Fichier** : `backend/src/routes/catalogRoutes.ts` L37-44  
**Sévérité** : **MEDIUM**

Le GET / fait un mapping partiel : `sellingPrice`, `price`, `unitPrice` sont tous mappés depuis `unit_price`, mais les champs booléens (`is_sellable` → `isSellable`, `is_purchasable` → `isPurchasable`, `track_stock` → `trackStock`) ainsi que les champs `is_package`, `includes_subscription`, `subscription_duration`, `stock_reference`, `accounting_account_sale`, `accounting_account_purchase`, `image_url` ne sont **pas** mappés en camelCase.

**Impact** : Le frontend reçoit `is_sellable` au lieu de `isSellable`, `image_url` au lieu de `imageUrl`, etc. Ces champs sont tous `undefined` côté frontend.

**Fix** : Compléter le mapping :

```typescript
const mappedRows = result.rows.map((row) => ({
  id: row.id,
  tenantId: row.tenant_id,
  tenantName: row.tenant_name,
  resellerId: row.reseller_id,
  name: row.name,
  type: row.type,
  category: row.category,
  sku: row.sku,
  description: row.description,
  price: row.unit_price,
  unitPrice: row.unit_price,
  sellingPrice: row.unit_price,
  unit: row.unit,
  taxRate: row.tax_rate,
  status: row.status,
  isSellable: row.is_sellable,
  isPurchasable: row.is_purchasable,
  trackStock: row.track_stock,
  accountingAccountSale: row.accounting_account_sale,
  accountingAccountPurchase: row.accounting_account_purchase,
  imageUrl: row.image_url,
  isPackage: row.is_package,
  includesSubscription: row.includes_subscription,
  subscriptionDuration: row.subscription_duration,
  stockReference: row.stock_reference,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
}));
```

---

### 🟡 MEDIUM-03 : api.ts list() envoie tenantId en query param (ignoré par le backend)

**Fichier** : `services/api.ts` L2851  
**Sévérité** : **MEDIUM**

```typescript
const response = await fetch(`${API_URL}/catalog?tenantId=${tenantId}`, { headers: getHeaders() });
```

Le backend **ignore** ce query param et utilise `req.user.tenantId` du JWT. Le paramètre est inutile et pourrait être un vecteur de confusion (un attaquant pourrait croire qu'il suffit de changer ce param pour accéder aux données d'un autre tenant).

**Fix** : Retirer le query param :

```typescript
const response = await fetch(`${API_URL}/catalog`, { headers: getHeaders() });
```

---

### 🟡 MEDIUM-04 : Table `catalog_items` orpheline en production

**Sévérité** : **MEDIUM**

La base de données contient **deux tables** pour le catalogue :

- `catalog` : 104 lignes, utilisée par toutes les routes
- `catalog_items` : 0 lignes, schéma différent, jamais requêtée

**Impact** : Confusion lors de la maintenance, risque qu'un développeur requête la mauvaise table.

**Fix** : Supprimer la table orpheline :

```sql
DROP TABLE IF EXISTS catalog_items;
```

---

### 🟡 MEDIUM-05 : Pas de vérification d'unicité (SKU/nom) à la création

**Fichier** : `backend/src/routes/catalogRoutes.ts` L73-83  
**Sévérité** : **MEDIUM**

Aucune vérification de doublon sur `sku` ou `name` + `tenant_id` avant INSERT. Deux articles identiques peuvent être créés.

**Fix** :

```typescript
// Vérifier unicité SKU (si fourni)
if (sku) {
  const existing = await pool.query('SELECT id FROM catalog WHERE sku = $1 AND tenant_id = $2', [sku, tenantId]);
  if (existing.rows.length > 0) {
    return res.status(409).json({ message: 'Un article avec ce SKU existe déjà' });
  }
}
```

---

### 🟡 MEDIUM-06 : CatalogDetail utilise des données MOCK pour Transactions et Historique

**Fichier** : `features/crm/components/CatalogDetail.tsx` L24-47  
**Sévérité** : **MEDIUM**

Les onglets "Transactions" et "Historique" dans la vue détail affichent des données **complètement factices** (MOCK_TRANSACTIONS, MOCK_HISTORY) générées aléatoirement, pas de vraies données.

**Impact** : L'utilisateur voit des transactions et un historique qui ne correspondent à aucune réalité. Très trompeur.

**Fix** : Implémenter les requêtes API pour :

1. Transactions : Chercher les `invoice_items` et `quote_items` qui référencent cet article
2. Historique : Requêter l'`audit_log` pour l'entité `catalog` avec cet ID

---

### 🟡 MEDIUM-07 : POST/PUT backend ne gèrent pas les champs étendus

**Fichier** : `backend/src/routes/catalogRoutes.ts` L73-99  
**Sévérité** : **MEDIUM**

Les routes POST et PUT n'acceptent que : `name, type, sku, description, purchasePrice, sellingPrice, taxRate, status`. Les champs suivants envoyés par le frontend sont **silencieusement ignorés** :

- `category` (Matériel, Abonnement, Prestation, Package)
- `unit`
- `isSellable`, `isPurchasable`, `trackStock`
- `accountingAccountSale`, `accountingAccountPurchase`
- `imageUrl`
- `resellerId`
- `isPackage`, `includesSubscription`, `subscriptionDuration`, `stockReference`

**Impact** : L'utilisateur saisit ces informations dans le formulaire, le submit semble réussir (le backend retourne 201), mais les données ne sont pas persisted en DB. Au prochain chargement, ces champs sont vides.

**Fix** : Aligner l'INSERT/UPDATE avec toutes les colonnes de la table `catalog`.

---

### 🟡 MEDIUM-08 : Mutation optimiste sans rollback en cas d'erreur API

**Fichier** : `contexts/DataContext.tsx` L1897-1912  
**Sévérité** : **MEDIUM**

Les mutations `addCatalogItemMutation`, `updateCatalogItemMutation`, `deleteCatalogItemMutation` utilisent `onSuccess` pour mettre à jour le cache mais n'implémentent pas `onError` pour faire un rollback. Si l'API échoue, le cache TanStack Query contient des données fantômes.

```typescript
const addCatalogItemMutation = useMutation({
    mutationFn: (item: CatalogItem) => api.catalog.create({ ... }),
    onSuccess: (newItem) => {
        queryClient.setQueryData(['catalog', tenantId], (old: CatalogItem[] = []) => [...old, newItem]);
    },
    // ❌ Pas de onError pour rollback
});
```

**Fix** :

```typescript
const addCatalogItemMutation = useMutation({
    mutationFn: (item: CatalogItem) => api.catalog.create({ ... }),
    onSuccess: (newItem) => {
        queryClient.setQueryData(['catalog', tenantId], (old: CatalogItem[] = []) => [...old, newItem]);
    },
    onError: () => {
        queryClient.invalidateQueries({ queryKey: ['catalog', tenantId] });
    },
});
```

---

### 🟡 MEDIUM-09 : Pas de DELETE dans le frontend CRMView

**Fichier** : `features/crm/components/CRMView.tsx`  
**Sévérité** : **MEDIUM**

Le composant `CRMView` expose `addCatalogItem`, `updateCatalogItem` et `deleteCatalogItem` depuis DataContext, mais **seuls add et update sont utilisés**. Il n'y a aucun bouton "Supprimer" dans l'UI. Le seul moyen de "retirer" un article est de le désactiver (`onToggleStatus`).

C'est potentiellement intentionnel (soft-disable), mais `deleteCatalogItem` existe sans UI. Documenter le choix ou ajouter le bouton avec confirmation.

---

### 🟢 LOW-01 : Le formulaire CatalogForm laisse l'utilisateur saisir l'ID manuellement

**Fichier** : `features/crm/components/CatalogForm.tsx` L65-70  
**Sévérité** : **LOW**

L'utilisateur peut saisir un ID personnalisé. Si cet ID existe déjà, le backend le rejetera (PK violation) mais l'erreur n'est pas bien gérée côté frontend.

**Fix** : Masquer le champ ID en création (laisser le backend générer `CAT-{timestamp}`) ou au minimum le valider côté frontend.

---

### 🟢 LOW-02 : `PRODUCT_CATALOG` hardcodé dans constants.ts

**Fichier** : `constants.ts` L168-180  
**Sévérité** : **LOW**

Un catalogue hardcodé existe dans `constants.ts` qui est importé par `DataContext.tsx` et `FinanceView.tsx`. Ces données statiques risquent d'être confondues avec les données réelles de la DB.

**Impact minimal** : `PRODUCT_CATALOG` semble être utilisé comme fallback ou seed initial, mais il n'est pas utilisé comme données principales dans les rendus.

---

### 🟢 LOW-03 : Pas de currency affiché dans CatalogList et CatalogDetail

**Fichier** : `features/crm/components/CatalogList.tsx` L179, `features/crm/components/CatalogDetail.tsx` L82  
**Sévérité** : **LOW**

Les prix sont affichés avec `toLocaleString('fr-FR')` mais sans symbole monétaire (FCFA/XOF). Le `CatalogForm` utilise correctement `useCurrency()`, mais la liste et le détail ne le font pas.

---

### 🟢 LOW-04 : Pas d'audit trail (AuditService) sur les mutations catalogue

**Fichier** : `backend/src/routes/catalogRoutes.ts`  
**Sévérité** : **LOW**

Aucune des opérations CRUD sur le catalogue n'appelle `AuditService.log()`. Les modifications ne sont pas traçables.

---

### 🟢 LOW-05 : Absence de confirmation avant désactivation d'un article

**Fichier** : `features/crm/components/CRMView.tsx` L296-298  
**Sévérité** : **LOW**

Le toggle de statut (ACTIVE → INACTIVE) s'effectue sans popup de confirmation. Un clic accidentel peut désactiver un article utilisé dans de nombreux documents.

---

### 🟢 LOW-06 : accessibilité — CatalogList n'a pas d'attribut `aria-label` sur la table

**Fichier** : `features/crm/components/CatalogList.tsx`  
**Sévérité** : **LOW**

La table n'a pas de `<caption>` ou `aria-label`. Les lecteurs d'écran n'auront pas de contexte.

---

### 🟢 LOW-07 : Le champ `price` existe en DB mais n'est pas utilisé

**Sévérité** : **LOW**

La table `catalog` a deux colonnes prix : `unit_price` (83 lignes avec données) et `price` (seulement 2 lignes avec données). La colonne `price` a été ajoutée après coup et n'est pas alimentée par le code.

**Fix** : Migrer `price` (si nécessaire) puis la supprimer, ou l'utiliser comme alias et supprimer `unit_price`.

---

## 3. Résumé par Sévérité

| Sévérité    | #   | IDs                    |
| ----------- | --- | ---------------------- |
| 🔴 CRITICAL | 4   | C-01, C-02, C-03, C-04 |
| 🟡 MEDIUM   | 9   | M-01 → M-09            |
| 🟢 LOW      | 7   | L-01 → L-07            |

---

## 4. Ordre de Priorité des Corrections

| Priorité | ID        | Effort | Description                                                           |
| -------- | --------- | ------ | --------------------------------------------------------------------- |
| **P0**   | C-01      | 1h     | Corriger les colonnes SQL (purchase_price/selling_price → unit_price) |
| **P0**   | C-02      | 30min  | Aligner le schéma Zod backend sur frontend (types, champs)            |
| **P0**   | M-07      | 1h     | Ajouter tous les champs manquants dans INSERT/UPDATE                  |
| **P1**   | M-02      | 30min  | Compléter le mapping camelCase dans GET /                             |
| **P1**   | C-03      | 15min  | Ajouter le bypass staff sur GET /:id                                  |
| **P1**   | C-04      | 1h     | Implémenter soft-delete + vérification références                     |
| **P1**   | M-01      | 5min   | Retourner status 500 au lieu de []                                    |
| **P2**   | M-05      | 30min  | Ajouter vérification unicité SKU                                      |
| **P2**   | M-08      | 15min  | Ajouter onError avec rollback TanStack Query                          |
| **P2**   | M-03      | 5min   | Retirer query param tenantId inutile                                  |
| **P2**   | L-04      | 30min  | Ajouter AuditService.log sur CRUD                                     |
| **P3**   | M-04      | 5min   | DROP table catalog_items orpheline                                    |
| **P3**   | M-06      | 4h     | Implémenter vrais Transactions et Historique dans CatalogDetail       |
| **P3**   | M-09      | 30min  | Ajouter bouton Delete avec confirmation (ou documenter le choix)      |
| **P3**   | L-01→L-07 | 2h     | Corrections mineures (currency, accessibility, confirmation)          |

---

## 5. Diagramme de Flux des Données

```
┌──────────────────┐     CatalogSchema (Zod)      ┌──────────────────────┐
│  CatalogForm.tsx │ ──────── validate ──────────▶ │ DataContext          │
│  (Frontend)      │   type: 'Produit'|'Service'   │ addCatalogItem()     │
│  price, unit,    │   category, price, unit...    │ updateCatalogItem()  │
│  category, etc.  │                               │ deleteCatalogItem()  │
└──────────────────┘                               └──────────┬───────────┘
                                                              │
                                                    api.catalog.create()
                                                              │
                                        ┌─────────────────────▼───────────────┐
                                        │  POST /api/catalog                  │
                                        │  Backend: catalogRoutes.ts          │
                                        │                                     │
                                        │  CatalogSchema (backend) ← ❌ MISMATCH │
                                        │  type: 'DEVICE'|'SERVICE'|...       │
                                        │  sellingPrice, purchasePrice        │
                                        │                                     │
                                        │  SQL INSERT: purchase_price, ← ❌ CRASH│
                                        │  selling_price (colonnes             │
                                        │  inexistantes en DB)                │
                                        └─────────────────────┬───────────────┘
                                                              │ FAIL
                                                              ▼
                                        ┌──────────────────────────────────────┐
                                        │  DB: catalog table                   │
                                        │  Colonnes: id, name, type,          │
                                        │  unit_price, category, unit, ...    │
                                        │  (PAS purchase_price/selling_price) │
                                        └──────────────────────────────────────┘
```

**Constat** : Le pipeline CREATE/UPDATE est **entièrement cassé** en production. Seul le GET / (lecture) fonctionne grâce au mapping ad-hoc. Les 104 articles ont été importés par script, pas via l'API standard.
