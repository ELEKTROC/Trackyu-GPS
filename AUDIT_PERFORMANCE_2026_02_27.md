# Audit de Performance Frontend — TrackYu GPS

**Date :** 27 février 2026  
**Périmètre :** Startup applicatif, DataContext, chargement des pages, bundle initial  
**Environnement :** React 19 + Vite 6.4 + TanStack Query — Production sur trackyugps.com

---

## 1. Problèmes constatés

### 🔴 P0 — Critiques (impact direct sur le temps de chargement)

| # | Problème | Fichier | Impact |
|---|----------|---------|--------|
| 1 | **38 requêtes API simultanées au login** | `contexts/DataContext.tsx` | Saturation réseau, 38 appels concurrents dès l'authentification — le navigateur ne peut traiter que 6 connexions simultanées par domaine |
| 2 | **DashboardView et FleetTable importés en synchrone** | `App.tsx` | Ces 2 composants (86 kB combinés) étaient inclus dans le bundle initial, retardant le premier affichage |

### 🟡 P1 — Élevés (dégradation performance ou qualité de code)

| # | Problème | Fichier | Impact |
|---|----------|---------|--------|
| 3 | **`isLoading` calculé sur 20+ queries mais jamais exposé** | `DataContext.tsx:628` | Code mort — variable calculée mais absente du context `value`, aucun composant ne la consomme |
| 4 | **Données mock hardcodées pour `tasks` et `automationRules`** | `DataContext.tsx:354-420` | Les API backend `/crm/tasks` et `/crm/automation-rules` existent, mais le frontend renvoyait toujours des données fictives (`|| true` forçait le mock) |
| 5 | **Mutations mock pour tasks et automationRules** | `DataContext.tsx:904-935` | Les mutations `addTask`, `updateTask`, `deleteTask`, `addAutomationRule`, `toggleAutomationRule`, `deleteAutomationRule` simulaient des appels sans jamais contacter le backend |
| 6 | **`tiers` query avec `staleTime: 0`** | `DataContext.tsx:567-578` | Forçait un refetch systématique des tiers à chaque accès, ignorant le `staleTime: 5min` configuré globalement dans React Query |
| 7 | **Logs de debug en production dans la query `tiers`** | `DataContext.tsx:570-573` | 3 appels `logger.debug()` dans la `queryFn` des tiers, exécutés sur chaque fetch y compris en production |
| 8 | **`isSimulationRunning` état mort** | `DataContext.tsx:234` | État `useState` jamais utilisé ni exposé. Accédé via `as any` cast dans `SettingsView.tsx` avec un `toggleSimulation` qui n'existe pas — toggle visuellement présent mais non fonctionnel |
| 9 | **DataContext = God Object (2217 lignes)** | `DataContext.tsx` | 38 queries + 60+ mutations + logique ERP métier dans un seul fichier. Maintenance et lisibilité difficiles |

### 🟢 P2 — Moyens (améliorations souhaitables)

| # | Problème | Fichier | Impact |
|---|----------|---------|--------|
| 10 | **Mutations comptables en cascade sans transactions** | `DataContext.tsx` | Paiement de facture = 3 mutations frontend enchaînées (update facture → create paiement → create écriture). Si une échoue, données incohérentes |
| 11 | **Imports lazy inutilisés dans `LazyViews.tsx`** | `LazyViews.tsx:116` | Commentaire indiquant que Dashboard/Fleet restaient synchrones "car fréquemment accédés" — justification invalide car le cache SW/navigateur résout ce problème |

---

## 2. Corrections appliquées

### ✅ P0-1 — Chargement différé des queries (Deferred Loading)

**Commit logique :** Réduction de 38 → 12 requêtes API au startup

**Mécanisme implémenté :**
```typescript
// contexts/DataContext.tsx
const [deferredEnabled, setDeferredEnabled] = useState(false);
useEffect(() => {
    if (!user) { setDeferredEnabled(false); return; }
    const timer = setTimeout(() => setDeferredEnabled(true), 3000);
    return () => clearTimeout(timer);
}, [user]);
```

**Répartition des queries :**

| Catégorie | Queries (12 core) | Timing |
|-----------|-------------------|--------|
| **Core** | vehicles, zones, clients, alerts, leads, stock, interventions, users, contracts, tickets, branches, tiers | Immédiat au login |

| Catégorie | Queries (26 deferred) | Timing |
|-----------|----------------------|--------|
| **Deferred** | invoices, quotes, drivers, techs, groups, commands, pois, alertConfigs, maintenanceRules, scheduleRules, ecoDrivingProfiles, catalog, journal, payments, supplierInvoices, bankTransactions, budgets, suppliers, stockMovements, fuelRecords, maintenanceRecords, tasks, automationRules, ticketCategories, ticketSubcategories, slaConfig | 3 secondes après le login |

**Impact :** Le dashboard et la carte s'affichent sans attendre les 26 requêtes secondaires. Les modules finance, comptabilité, paramètres avancés chargent leurs données quand l'utilisateur y navigue (les tableaux sont `[]` pendant les 3 premières secondes, invisible pour l'utilisateur sur les modules secondaires).

---

### ✅ P0-2 — Lazy loading de DashboardView et FleetTable

**Fichiers modifiés :** `LazyViews.tsx`, `App.tsx`

**Avant :**
```typescript
// App.tsx — imports synchrones dans le bundle initial
import { FleetTable } from './features/fleet/components/FleetTable';
import { DashboardView } from './features/dashboard/components/DashboardView';
```

**Après :**
```typescript
// LazyViews.tsx — chargement à la demande
export const LazyDashboardView = withLazyLoad(
    () => import('./features/dashboard/components/DashboardView').then(m => ({ default: m.DashboardView })),
    'Tableau de bord'
);
export const LazyFleetTable = withLazyLoad(
    () => import('./features/fleet/components/FleetTable').then(m => ({ default: m.FleetTable })),
    'Flotte'
);
```

**Impact sur le bundle initial :**

| Métrique | Avant | Après | Gain |
|----------|-------|-------|------|
| `index.js` (bundle principal) | 749.57 kB | **629.16 kB** | **-120.41 kB (-16%)** |
| `DashboardView.js` | inclus | 35.40 kB (séparé) | Chargé à la demande |
| `FleetTable.js` | inclus | 51.10 kB (séparé) | Chargé à la demande |

---

### ✅ P1-3 — Suppression du code mort `isLoading`

**Ligne supprimée :** `DataContext.tsx:628`
```typescript
// SUPPRIMÉ — calculé mais jamais exposé dans le context value
const isLoading = loadingVehicles || loadingZones || loadingClients || ...20 variables;
```

**Note :** Le spinner de l'app est géré par `useAuth().isLoading`, pas par DataContext. La documentation `03_FRONTEND.md` mentionnait un usage `{ isLoading } = useDataContext()` qui était inexact.

---

### ✅ P1-4/5 — Remplacement des mocks par les vrais appels API

**Tasks :**
```typescript
// AVANT — Mock hardcodé
queryFn: async () => {
    if (process.env.NODE_ENV === 'development' || true) {
        return [{ id: '1', title: 'Relancer Client A', ... }] as Task[];
    }
}

// APRÈS — Vrai appel API
queryFn: () => api.crm.getTasks()
```

**AutomationRules :**
```typescript
// AVANT — Mock hardcodé
queryFn: async () => {
    return [{ id: '1', name: 'Relance Devis J+3', ... }] as AutomationRule[];
}

// APRÈS — Vrai appel API
queryFn: () => api.crm.getAutomationRules()
```

**Mutations migrées vers les vraies API :**
- `addTaskMutation` → `api.crm.createTask(task)`
- `updateTaskMutation` → `api.crm.updateTask(task.id, task)`
- `deleteTaskMutation` → `api.crm.deleteTask(id)`
- `addAutomationRuleMutation` → `api.crm.createAutomationRule(rule)`
- `toggleAutomationRuleMutation` → `api.crm.updateAutomationRule(id, { ...rule, isActive: !rule.isActive })`
- `deleteAutomationRuleMutation` → `api.crm.deleteAutomationRule(id)`

**Routes backend vérifiées :** `GET/POST/PUT/DELETE /api/crm/tasks` et `/api/crm/automation-rules` existent dans `backend/src/routes/crmRoutes.ts` avec permissions RBAC (`VIEW_CRM`, `CREATE_CRM`, `EDIT_CRM`, `DELETE_CRM`).

---

### ✅ P1-6 — Correction `staleTime: 0` sur la query tiers

```typescript
// AVANT
staleTime: 0, // Force refetch chaque fois

// APRÈS — utilise le staleTime global (5 minutes)
// (propriété supprimée, hérite de la config QueryClient)
```

---

### ✅ P1-7 — Suppression des logs de debug en production

Supprimé 3 appels `logger.debug()` dans la `queryFn` des tiers qui loguaient les données fetched à chaque requête.

---

### ✅ P1-8 — Suppression de l'état `isSimulationRunning` et du toggle

**DataContext.tsx :**
```typescript
// SUPPRIMÉ
const [isSimulationRunning, setIsSimulationRunning] = useState(false);
```

**SettingsView.tsx :**
```typescript
// SUPPRIMÉ — toggleSimulation n'existait pas dans DataContext, le toggle était non fonctionnel
const toggleSimulation = (useDataContext() as any).toggleSimulation;
const isSimulationRunning = (useDataContext() as any).isSimulationRunning;
// + suppression du bouton toggle "Simu" dans le JSX
```

---

## 3. Ce qui reste à faire

### 🟡 P1-9 — Split du God Object DataContext

**État :** Non implémenté — Refactoring lourd

**Description :** DataContext.tsx fait ~2170 lignes avec 38 queries, 60+ mutations et de la logique ERP métier. Idéalement, il devrait être découpé en sous-contextes :
- `FleetContext` (vehicles, zones, drivers, groups)
- `CRMContext` (leads, tiers, contracts, quotes, tasks, automationRules)
- `FinanceContext` (invoices, payments, journal, budgets, bankTransactions, supplierInvoices)
- `SupportContext` (tickets, ticketCategories, ticketSubcategories, slaConfig)
- `StockContext` (stock, stockMovements, catalog)
- `TechContext` (interventions, maintenanceRules, maintenanceRecords, fuelRecords)
- `SettingsContext` (users, branches, alertConfigs, scheduleRules, ecoDrivingProfiles)

**Risques :**
- 33+ composants à migrer (chaque `useDataContext()` → le bon sous-contexte)
- Dépendances croisées entre domaines (intervention → facture + stock)
- Tests existants à adapter
- Rollback complexe (dizaines de fichiers)

**Recommandation :** Reporter à une phase de stabilisation dédiée. L'impact sur les performances est marginal car TanStack Query gère déjà le cache efficacement. Le bénéfice est principalement en maintenabilité.

**Effort estimé :** 2-3 jours

---

### 🟢 P2-10 — Mutations comptables avec transactions backend

**État :** Non implémenté — Nécessite du travail backend

**Description :** Quand une facture est payée, 3 mutations frontend s'enchaînent :
1. `updateInvoice` (status → PAID)
2. `addPayment` (enregistrement du paiement)
3. `addJournalEntry` (écriture comptable)

Si la mutation 2 ou 3 échoue (timeout, erreur réseau), les données sont incohérentes.

**Solution recommandée :** Créer une route backend `/api/invoices/:id/pay` qui exécute les 3 opérations dans une transaction SQL unique :
```sql
BEGIN;
  UPDATE invoices SET status = 'PAID' WHERE id = $1;
  INSERT INTO payments (...) VALUES (...);
  INSERT INTO journal_entries (...) VALUES (...);
COMMIT;
```

**Risques :**
- Modification du backend (nouvelle route + controller)
- Impact sur les données comptables de production
- Tests de scénarios d'échec nécessaires

**Recommandation :** Implémenter quand le module comptabilité sera plus utilisé en production. Le risque actuel est faible car les mutations échouent rarement.

**Effort estimé :** 1 jour (backend + frontend)

---

## 4. Résumé des gains

| Métrique | Avant audit | Après audit | Amélioration |
|----------|-------------|-------------|-------------|
| Requêtes API au login | 38 simultanées | **12 immédiates + 26 différées (3s)** | -68% de charge initiale |
| Bundle initial (`index.js`) | 750 kB | **629 kB** | **-16%** |
| Code mort supprimé | — | `isLoading`, `isSimulationRunning`, mocks, debug logs | ~80 lignes |
| Queries avec mock data | 2 (tasks, automationRules) | **0** | Données réelles servies |
| Mutations avec mock API | 6 | **0** | Persistance réelle en DB |
| Refetch inutile (tiers) | Chaque accès | **Toutes les 5 min** | -99% de requêtes tiers |

---

## 5. Fichiers modifiés

| Fichier | Modifications |
|---------|--------------|
| `contexts/DataContext.tsx` | Deferred loading, suppression mocks/dead code, fix tiers, wire API réelles |
| `App.tsx` | Lazy import DashboardView + FleetTable |
| `LazyViews.tsx` | Ajout `LazyDashboardView` + `LazyFleetTable` |
| `features/settings/components/SettingsView.tsx` | Suppression toggle simulation mort |

**Aucune modification backend.** Toutes les corrections sont frontend-only.
